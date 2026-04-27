"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import levenshtein from "fast-levenshtein";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCircle2, ChevronDown, Image as ImageIcon, Loader2, MapPin, Pencil, Search, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { extractFromInput, geocodeQuery, inferCategory, type GeocodingResult, type GeocodeOptions } from "@/features/capture/extractors";
import type { ExtractedCandidate, Place } from "@/lib/types";
import { CATEGORY_ICONS, haversineKm, id as genId } from "@/lib/utils";
import { usePlacesStore } from "@/store/places";

type ReviewStatus = "valid" | "needs_review" | "error" | "duplicate";

interface ReviewRow {
  id: string;
  input: string;
  query: string;
  status: ReviewStatus;
  selected?: GeocodingResult;
  options: GeocodingResult[];
  confidence: "high" | "medium" | "low";
  message: string;
  sourceUrl?: string;
  sourceType?: ExtractedCandidate["sourceType"];
  editing?: boolean;
  loading?: boolean;
}

interface CaptureInboxProps {
  tripId?: string;
  onClose?: () => void;
  initialInput?: string;
}

const EUROPE_COUNTRY_CODES = [
  "AL", "AD", "AT", "BE", "BA", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IS", "IE", "IT", "LV", "LI", "LT", "LU", "MT", "MD", "MC", "ME", "NL", "MK", "NO", "PL", "PT",
  "RO", "SM", "RS", "SK", "SI", "ES", "SE", "CH", "TR", "UA", "GB", "VA",
];

const EUROPE_VIEWBOX: [number, number, number, number] = [-25, 34, 45, 72];

export function CaptureInbox({ tripId, onClose, initialInput }: CaptureInboxProps) {
  const { createPlace, places } = usePlacesStore();
  const [input, setInput] = useState(initialInput ?? "");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [success, setSuccess] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const tripPlaces = useMemo(() => places.filter((place) => !tripId || place.tripId === tripId), [places, tripId]);
  const geocodeOptions = useMemo(() => buildGeocodeOptions(tripPlaces), [tripPlaces]);
  const validCount = rows.filter((row) => row.status === "valid").length;
  const reviewCount = rows.filter((row) => row.status !== "valid").length;

  useEffect(() => {
    if (initialInput) setInput(initialInput);
  }, [initialInput]);

  useEffect(() => {
    const query = currentLine(input).trim();
    if (query.length < 3 || rows.length) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSuggestionLoading(true);
      const found = await geocodeQuery(query, { ...geocodeOptions, limit: 6 });
      setSuggestions(rankResults(query, found, geocodeOptions.near).slice(0, 6));
      setSuggestionIndex(0);
      setSuggestionLoading(false);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [input, rows.length, geocodeOptions]);

  const handleParse = async () => {
    const lines = splitLines(input);
    if (!lines.length) {
      toast.info("Paste one place per line.");
      return;
    }

    setParsing(true);
    setSuccess(false);
    const seen = new Set<string>();
    const resolved: ReviewRow[] = [];
    for (const line of lines) {
      const row = await resolveLine(line, geocodeOptions, tripPlaces, seen);
      if (row.selected) seen.add(placeKey(row.selected));
      resolved.push(row);
    }
    setRows(resolved);
    setParsing(false);
  };

  const handleAddAll = async () => {
    const valid = rows.filter((row) => row.status === "valid" && row.selected);
    if (!valid.length) {
      toast.info("No ready places yet. Accept or fix suggestions first.");
      return;
    }

    setAdding(true);
    for (const row of valid) {
      const place = row.selected!;
      await createPlace({
        title: normalizePlaceName(place.name ?? primaryDisplayName(place)),
        latitude: place.lat,
        longitude: place.lng,
        city: place.city,
        country: place.country,
        neighborhood: place.neighborhood,
        address: place.address,
        sourceType: row.sourceType ?? "manual",
        sourceUrl: row.sourceUrl,
        category: inferCategory(place.displayName),
      }, tripId);
    }
    const needsReview = rows.length - valid.length;
    setRows((prev) => prev.filter((row) => row.status !== "valid"));
    setInput("");
    setSuccess(true);
    setAdding(false);
    toast.success(`Added ${valid.length} place${valid.length === 1 ? "" : "s"} · ${needsReview} need review`);
    textareaRef.current?.focus();
    if (!needsReview) window.setTimeout(() => onClose?.(), 650);
  };

  const updateRowQuery = (rowId: string, query: string) => {
    setRows((prev) => prev.map((row) => row.id === rowId ? { ...row, query, editing: true } : row));
  };

  const searchRow = async (rowId: string) => {
    const row = rows.find((item) => item.id === rowId);
    if (!row) return;
    setRows((prev) => prev.map((item) => item.id === rowId ? { ...item, loading: true } : item));
    const next = await resolveLine(row.query, geocodeOptions, tripPlaces, new Set(rows.filter((item) => item.id !== rowId && item.selected).map((item) => placeKey(item.selected!))));
    setRows((prev) => prev.map((item) => item.id === rowId ? { ...next, id: rowId, input: row.input, editing: false, loading: false } : item));
  };

  const chooseOption = (rowId: string, option: GeocodingResult, confirmed = true) => {
    setRows((prev) => prev.map((row) => {
      if (row.id !== rowId) return row;
      return {
        ...row,
        selected: option,
        status: confirmed ? "valid" : row.status,
        confidence: confirmed ? "high" : row.confidence,
        message: confirmed ? "Confirmed by you." : row.message,
        editing: false,
      };
    }));
  };

  const rejectRow = (rowId: string) => setRows((prev) => prev.filter((row) => row.id !== rowId));

  const acceptSuggestion = (suggestion: GeocodingResult) => {
    const replacement = normalizePlaceName(suggestion.name ?? primaryDisplayName(suggestion));
    setInput(replaceCurrentLine(input, replacement));
    setSuggestions([]);
    textareaRef.current?.focus();
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSuggestionIndex((idx) => (idx + 1) % suggestions.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSuggestionIndex((idx) => (idx - 1 + suggestions.length) % suggestions.length);
      } else if (event.key === "Enter" && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        acceptSuggestion(suggestions[suggestionIndex]);
      }
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void handleParse();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder={"Paste one place per line...\nHallstatt\nVienna\nBudapest\nCharles Bridge Prague"}
          rows={5}
          className="resize-none text-sm"
        />
        {(suggestionLoading || suggestions.length > 0) && (
          <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
            {suggestionLoading && (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Searching places...
              </div>
            )}
            {!suggestionLoading && suggestions.map((suggestion, index) => (
              <button
                type="button"
                key={`${suggestion.lat}-${suggestion.lng}-${suggestion.displayName}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => acceptSuggestion(suggestion)}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors ${index === suggestionIndex ? "bg-muted" : "hover:bg-muted"}`}
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{normalizePlaceName(suggestion.name ?? primaryDisplayName(suggestion))}</span>
                  <span className="block truncate text-xs text-muted-foreground">{locationLine(suggestion)} · {suggestion.type ?? "place"}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" disabled={parsing} onClick={handleParse} className="flex-1">
          {parsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
          {parsing ? "Searching places..." : "Preview places"}
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={() => fileRef.current?.click()} aria-label="Upload screenshot">
          <ImageIcon className="h-4 w-4" />
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) toast.info("Screenshot saved — add the place name here and NomadNote will match it.");
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Tip: paste 20 places at once. NomadNote previews matches before anything is saved.
      </p>

      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 rounded-xl border border-secondary/25 bg-secondary/10 p-3 text-sm font-medium text-secondary">
            <CheckCircle2 className="h-4 w-4" />
            Places added. Ready for the next paste.
          </motion.div>
        )}
      </AnimatePresence>

      {rows.length > 0 && (
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Review before adding</p>
              <p className="text-xs text-muted-foreground">{validCount} ready · {reviewCount} need review</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setRows([])}>Cancel</Button>
              <Button type="button" size="sm" disabled={adding || validCount === 0} onClick={handleAddAll}>
                {adding ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-2 h-3.5 w-3.5" />}
                Add all valid
              </Button>
            </div>
          </div>
          <div className="max-h-[52vh] divide-y divide-border overflow-y-auto">
            {rows.map((row) => (
              <ReviewRowCard
                key={row.id}
                row={row}
                onQueryChange={(query) => updateRowQuery(row.id, query)}
                onSearch={() => searchRow(row.id)}
                onChoose={(option, confirmed) => chooseOption(row.id, option, confirmed)}
                onReject={() => rejectRow(row.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewRowCard({
  row,
  onQueryChange,
  onSearch,
  onChoose,
  onReject,
}: {
  row: ReviewRow;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  onChoose: (option: GeocodingResult, confirmed: boolean) => void;
  onReject: () => void;
}) {
  const tone = row.status === "valid" ? "success" : row.status === "duplicate" ? "secondary" : row.status === "error" ? "destructive" : "warning";
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="p-3">
      <div className="flex items-start gap-3">
        <StatusIcon status={row.status} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Original:</span>
            <span className="truncate text-sm font-medium">{row.input}</span>
            <Badge variant={tone as "success" | "secondary" | "destructive" | "warning"} className="text-[11px] capitalize">{row.confidence} confidence</Badge>
          </div>

          {row.editing ? (
            <div className="mt-2 flex gap-2">
              <Input value={row.query} onChange={(event) => onQueryChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onSearch()} />
              <Button type="button" size="sm" onClick={onSearch} disabled={row.loading}>
                {row.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search"}
              </Button>
            </div>
          ) : row.selected ? (
            <div className="mt-1 text-sm">
              <span className="font-semibold">{normalizePlaceName(row.selected.name ?? primaryDisplayName(row.selected))}</span>
              <span className="text-muted-foreground"> → {locationLine(row.selected)}</span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">No match yet.</p>
          )}

          <p className="mt-1 text-xs leading-5 text-muted-foreground">{row.message}</p>

          {row.options.length > 1 && (
            <details className="mt-2">
              <summary className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary">
                <ChevronDown className="h-3 w-3" />
                Choose another result
              </summary>
              <div className="mt-2 grid gap-1">
                {row.options.slice(0, 4).map((option) => (
                  <button
                    type="button"
                    key={`${option.lat}-${option.lng}-${option.displayName}`}
                    onClick={() => onChoose(option, true)}
                    className="rounded-lg bg-muted/60 px-3 py-2 text-left text-xs transition-colors hover:bg-muted"
                  >
                    <span className="block font-semibold">{normalizePlaceName(option.name ?? primaryDisplayName(option))}</span>
                    <span className="block text-muted-foreground">{locationLine(option)} · {option.type ?? "place"}</span>
                  </button>
                ))}
              </div>
            </details>
          )}
        </div>
        <div className="flex flex-shrink-0 gap-1">
          {row.status === "needs_review" && row.selected && (
            <Button type="button" size="sm" variant="outline" onClick={() => onChoose(row.selected!, true)}>
              Use this
            </Button>
          )}
          <Button type="button" size="icon-sm" variant="ghost" onClick={() => onQueryChange(row.query)} aria-label={`Edit ${row.input}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="icon-sm" variant="ghost" onClick={onReject} aria-label={`Remove ${row.input}`}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function StatusIcon({ status }: { status: ReviewStatus }) {
  const className = "mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full";
  if (status === "valid") return <span className={`${className} bg-secondary/10 text-secondary`}><Check className="h-4 w-4" /></span>;
  if (status === "duplicate") return <span className={`${className} bg-muted text-muted-foreground`}>×</span>;
  if (status === "error") return <span className={`${className} bg-destructive/10 text-destructive`}>!</span>;
  return <span className={`${className} bg-accent/20 text-accent-foreground`}>?</span>;
}

async function resolveLine(line: string, options: GeocodeOptions, existing: Place[], seen: Set<string>): Promise<ReviewRow> {
  const id = genId();
  const query = line.trim();
  try {
    const extracted = await extractFromInput(query);
    const first = extracted[0];
    if (first?.latitude && first.longitude) {
      const direct: GeocodingResult = {
        lat: first.latitude,
        lng: first.longitude,
        displayName: first.title ?? query,
        name: first.title ?? query,
        city: first.city,
        country: first.country,
        neighborhood: first.neighborhood,
        address: first.address,
        type: "pin",
        importance: 1,
      };
      return buildRow(id, line, query, [direct], direct, "high", "Coordinates or map link parsed directly.", first.sourceUrl, first.sourceType, existing, seen);
    }

    const search = first?.title && first.title !== query ? first.title : query;
    const found = rankResults(search, await geocodeQuery(search, { ...options, limit: 6 }), options.near);
    if (!found.length) {
      return { id, input: line, query, status: "error", options: [], confidence: "low", message: "No match found. Edit this line and search again.", sourceUrl: first?.sourceUrl, sourceType: first?.sourceType };
    }

    const selected = found[0];
    const confidence = confidenceFor(search, selected, found);
    const typo = normalized(search) !== normalized(selected.name ?? primaryDisplayName(selected));
    const status: ReviewStatus = confidence === "high" ? "valid" : "needs_review";
    const message = confidence === "high"
      ? "Matched automatically."
      : typo
        ? `Did you mean ${normalizePlaceName(selected.name ?? primaryDisplayName(selected))}?`
        : "Ambiguous match. Choose the correct result.";
    return buildRow(id, line, query, found, selected, confidence, message, first?.sourceUrl, first?.sourceType, existing, seen, status);
  } catch {
    return { id, input: line, query, status: "error", options: [], confidence: "low", message: "Search failed. Try again or edit manually." };
  }
}

function buildRow(
  id: string,
  input: string,
  query: string,
  options: GeocodingResult[],
  selected: GeocodingResult,
  confidence: "high" | "medium" | "low",
  message: string,
  sourceUrl: string | undefined,
  sourceType: ExtractedCandidate["sourceType"] | undefined,
  existing: Place[],
  seen: Set<string>,
  fallbackStatus?: ReviewStatus
): ReviewRow {
  const duplicate = isDuplicate(selected, existing) || seen.has(placeKey(selected));
  return {
    id,
    input,
    query,
    selected,
    options,
    confidence,
    sourceUrl,
    sourceType,
    status: duplicate ? "duplicate" : fallbackStatus ?? (confidence === "high" ? "valid" : "needs_review"),
    message: duplicate ? "Already saved in this trip, so it will not be added again." : message,
  };
}

function buildGeocodeOptions(places: Place[]): GeocodeOptions {
  const withCoords = places.filter((place) => typeof place.latitude === "number" && typeof place.longitude === "number");
  const countryCodes = Array.from(new Set(places.map(countryToCode).filter(Boolean))) as string[];
  const europeish = countryCodes.some((code) => EUROPE_COUNTRY_CODES.includes(code));
  const near = withCoords.length
    ? {
        lat: withCoords.reduce((sum, place) => sum + place.latitude!, 0) / withCoords.length,
        lng: withCoords.reduce((sum, place) => sum + place.longitude!, 0) / withCoords.length,
      }
    : undefined;
  return {
    limit: 6,
    near,
    viewbox: europeish ? EUROPE_VIEWBOX : undefined,
    countryCodes: countryCodes.length && countryCodes.length <= 3 ? countryCodes.map((code) => code.toLowerCase()) : undefined,
  };
}

function rankResults(query: string, results: GeocodingResult[], near?: { lat: number; lng: number }) {
  return [...results].sort((a, b) => scoreResult(query, b, near) - scoreResult(query, a, near));
}

function scoreResult(query: string, result: GeocodingResult, near?: { lat: number; lng: number }) {
  const name = result.name ?? primaryDisplayName(result);
  const distance = levenshtein.get(normalized(query), normalized(name));
  const maxLen = Math.max(normalized(query).length, normalized(name).length, 1);
  const fuzzy = 1 - distance / maxLen;
  const importance = result.importance ?? 0.3;
  const nearBonus = near ? Math.max(0, 1 - haversineKm(near.lat, near.lng, result.lat, result.lng) / 1200) * 0.15 : 0;
  return fuzzy * 0.65 + importance * 0.25 + nearBonus;
}

function confidenceFor(query: string, selected: GeocodingResult, options: GeocodingResult[]): "high" | "medium" | "low" {
  const score = scoreResult(query, selected);
  const second = options[1] ? scoreResult(query, options[1]) : 0;
  if (score > 0.82 && score - second > 0.08) return "high";
  if (score > 0.58) return "medium";
  return "low";
}

function isDuplicate(result: GeocodingResult, existing: Place[]) {
  const key = placeKey(result);
  return existing.some((place) => normalized(`${place.title}|${place.city ?? ""}|${place.country ?? ""}`) === key);
}

function placeKey(result: GeocodingResult) {
  return normalized(`${result.name ?? primaryDisplayName(result)}|${result.city ?? ""}|${result.country ?? ""}`);
}

function splitLines(value: string) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function currentLine(value: string) {
  return value.split(/\r?\n/).at(-1) ?? value;
}

function replaceCurrentLine(value: string, replacement: string) {
  const lines = value.split(/\r?\n/);
  lines[lines.length - 1] = replacement;
  return lines.join("\n");
}

function primaryDisplayName(result: GeocodingResult) {
  return result.displayName.split(",")[0] ?? result.displayName;
}

function locationLine(result: GeocodingResult) {
  return [result.city ?? result.neighborhood, result.country].filter(Boolean).join(", ") || result.displayName;
}

function normalizePlaceName(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => /^(of|and|the|de|da|do|del|di|la|le|el)$/i.test(part) ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .replace(/\bIi+\b/g, (match) => match.toUpperCase());
}

function normalized(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9|]+/g, " ").trim();
}

function countryToCode(place: Place) {
  const country = place.country?.toLowerCase();
  const map: Record<string, string> = {
    austria: "AT",
    hungary: "HU",
    czechia: "CZ",
    "czech republic": "CZ",
    germany: "DE",
    france: "FR",
    italy: "IT",
    spain: "ES",
    portugal: "PT",
    japan: "JP",
    "united states": "US",
    usa: "US",
    brazil: "BR",
  };
  return country ? map[country] : undefined;
}
