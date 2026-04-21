import { create } from "zustand";
import type { ExtractedCandidate, Place, SourceType } from "@/lib/types";
import { candidatesRepo } from "@/lib/db";
import { id, now } from "@/lib/utils";
import { extractFromInput } from "@/features/capture/extractors";

interface CaptureState {
  candidates: ExtractedCandidate[];
  processing: boolean;
  error: string | null;

  loadCandidates: () => Promise<void>;
  processInput: (input: string, tripId?: string) => Promise<ExtractedCandidate[]>;
  confirmCandidate: (candidateId: string) => Promise<Partial<Place>>;
  rejectCandidate: (candidateId: string) => Promise<void>;
  clearResolved: () => Promise<void>;
  addManualCandidate: (data: Partial<ExtractedCandidate>) => Promise<ExtractedCandidate>;
}

export const useCaptureStore = create<CaptureState>()((set, get) => ({
  candidates: [],
  processing: false,
  error: null,

  loadCandidates: async () => {
    const candidates = await candidatesRepo.getPending();
    set({ candidates });
  },

  processInput: async (input, _tripId) => {
    set({ processing: true, error: null });
    try {
      const extracted = await extractFromInput(input.trim());
      const ts = now();
      const candidates: ExtractedCandidate[] = extracted.map((e) => ({
        ...e,
        id: id(),
        rawInput: input,
        status: "pending" as const,
        createdAt: ts,
      }));

      for (const c of candidates) {
        await candidatesRepo.create(c);
      }

      set((s) => ({
        candidates: [...candidates, ...s.candidates],
        processing: false,
      }));

      return candidates;
    } catch (e) {
      const error = e instanceof Error ? e.message : "Extraction failed";
      set({ processing: false, error });
      return [];
    }
  },

  confirmCandidate: async (candidateId) => {
    await candidatesRepo.update(candidateId, { status: "confirmed" });
    const c = get().candidates.find((x) => x.id === candidateId);
    set((s) => ({
      candidates: s.candidates.filter((x) => x.id !== candidateId),
    }));
    if (!c) return {};
    // Convert candidate into partial Place data
    return {
      title: c.title ?? c.rawInput.slice(0, 80),
      latitude: c.latitude,
      longitude: c.longitude,
      address: c.address,
      city: c.city,
      country: c.country,
      neighborhood: c.neighborhood,
      category: c.category ?? "other",
      sourceType: c.sourceType ?? "other",
      sourceUrl: c.sourceUrl,
    };
  },

  rejectCandidate: async (candidateId) => {
    await candidatesRepo.update(candidateId, { status: "rejected" });
    set((s) => ({
      candidates: s.candidates.filter((x) => x.id !== candidateId),
    }));
  },

  clearResolved: async () => {
    await candidatesRepo.clear();
  },

  addManualCandidate: async (data) => {
    const candidate: ExtractedCandidate = {
      id: id(),
      rawInput: data.rawInput ?? "",
      inputType: data.inputType ?? "text",
      title: data.title,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address,
      city: data.city,
      country: data.country,
      neighborhood: data.neighborhood,
      category: data.category,
      sourceUrl: data.sourceUrl,
      sourceType: data.sourceType,
      confidence: data.confidence ?? "low",
      confidenceReason: data.confidenceReason ?? "Manually entered",
      status: "pending",
      createdAt: now(),
    };
    await candidatesRepo.create(candidate);
    set((s) => ({ candidates: [candidate, ...s.candidates] }));
    return candidate;
  },
}));
