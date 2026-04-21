"use client";
import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Link, Type, Image as ImageIcon, MapPin, Loader2, Check, X,
  ChevronDown, AlertCircle, Info,
} from "lucide-react";
import { cn, id as genId } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCaptureStore } from "@/store/capture";
import { usePlacesStore } from "@/store/places";
import { geocodeQuery, inferCategory } from "@/features/capture/extractors";
import type { ExtractedCandidate, PlaceCategory } from "@/lib/types";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { CATEGORY_ICONS } from "@/lib/utils";

const schema = z.object({ input: z.string().min(1, "Enter a URL, place name, or notes") });

interface CaptureInboxProps {
  tripId?: string;
  onClose?: () => void;
}

export function CaptureInbox({ tripId, onClose }: CaptureInboxProps) {
  const [candidates, setCandidates] = useState<ExtractedCandidate[]>([]);
  const [geocoding, setGeocoding] = useState<string | null>(null);
  const { processInput } = useCaptureStore();
  const { createPlace } = usePlacesStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async ({ input }) => {
    const results = await processInput(input, tripId);
    setCandidates(results);
    reset();
  });

  const handleConfirm = async (c: ExtractedCandidate) => {
    // If no coordinates, try geocoding
    let lat = c.latitude;
    let lng = c.longitude;
    let city = c.city;
    let country = c.country;
    let neighborhood = c.neighborhood;

    if (!lat || !lng) {
      setGeocoding(c.id);
      const results = await geocodeQuery(c.title ?? c.rawInput);
      if (results.length) {
        lat = results[0].lat;
        lng = results[0].lng;
        city = city ?? results[0].city;
        country = country ?? results[0].country;
        neighborhood = neighborhood ?? results[0].neighborhood;
        toast.success("Location found via geocoding");
      } else {
        toast.warning("Couldn't find coordinates — saved without location");
      }
      setGeocoding(null);
    }

    await createPlace({
      title: c.title ?? "Unnamed Place",
      latitude: lat,
      longitude: lng,
      city,
      country,
      neighborhood,
      sourceType: c.sourceType ?? "other",
      sourceUrl: c.sourceUrl,
      category: c.category ?? inferCategory(c.title ?? ""),
    }, tripId);

    setCandidates((prev) => prev.filter((x) => x.id !== c.id));
    toast.success(`"${c.title}" saved to places`);
    if (candidates.length <= 1) onClose?.();
  };

  const handleReject = (id: string) => {
    setCandidates((prev) => prev.filter((x) => x.id !== id));
  };

  const confidenceBadge = (c: "high" | "medium" | "low") => ({
    high: <Badge variant="success" className="text-xs">High confidence</Badge>,
    medium: <Badge variant="warning" className="text-xs">Review needed</Badge>,
    low: <Badge variant="secondary" className="text-xs">Manual required</Badge>,
  })[c];

  return (
    <div className="flex flex-col gap-4">
      {/* Input form */}
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <Textarea
          {...register("input")}
          placeholder="Paste a Google Maps link, TikTok URL, address, place name, or any notes…"
          rows={3}
          className="resize-none text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSubmit(e as unknown as React.FormEvent);
          }}
        />
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MapPin className="h-4 w-4 mr-2" />}
            Extract Places
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={() => fileRef.current?.click()}>
            <ImageIcon className="h-4 w-4" />
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) toast.info("Screenshot saved — tag a location manually to pin it on the map");
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Supports Google Maps, Apple Maps, TikTok, Instagram, YouTube, blog links, addresses, coordinates
        </p>
      </form>

      {/* Candidates */}
      <AnimatePresence>
        {candidates.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">
                {candidates.length} place{candidates.length !== 1 ? "s" : ""} extracted
              </p>
              <span className="text-xs text-muted-foreground">— confirm or dismiss each one</span>
            </div>

            {candidates.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="rounded-xl border border-border bg-muted/30 p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base">{CATEGORY_ICONS[c.category ?? "other"]}</span>
                      <span className="font-medium text-sm truncate">{c.title ?? c.rawInput.slice(0, 60)}</span>
                      {confidenceBadge(c.confidence)}
                    </div>
                    {(c.city || c.country) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <MapPin className="inline h-3 w-3 mr-0.5" />
                        {[c.neighborhood, c.city, c.country].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {c.latitude && c.longitude && (
                      <p className="text-xs text-muted-foreground font-mono-custom">
                        {c.latitude.toFixed(5)}, {c.longitude.toFixed(5)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                      <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      {c.confidenceReason}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleConfirm(c)}
                    disabled={geocoding === c.id}
                    className="flex-1"
                  >
                    {geocoding === c.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Check className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Save Place
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReject(c.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
