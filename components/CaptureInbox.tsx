"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import levenshtein from "fast-levenshtein";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCircle2, ChevronDown, Image as ImageIcon, Loader2, MapPin, Pencil, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { extractFromInput, geocodeQuery, inferCategory, type GeocodingResult, type GeocodeOptions } from "@/features/capture/extractors";
import type { ExtractedCandidate, Place, Trip } from "@/lib/types";
import { CATEGORY_ICONS, haversineKm, id as genId } from "@/lib/utils";
import { usePlacesStore } from "@/store/places";
import { useTripsStore } from "@/store/trips";

type ReviewStatus = "valid" | "needs_review" | "error" | "duplicate";
type CaptureMode = "paste" | "search";

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
  fuzzyMatched?: boolean;
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
const CENTRAL_EUROPE_VIEWBOX: [number, number, number, number] = [5, 42, 31, 53];
const CENTRAL_EUROPE_CODES = ["AT", "HU", "CZ", "SI", "HR", "BA", "ME", "GR", "DE"];
const CENTRAL_EUROPE_HINTS = [
  "europe", "austria", "vienna", "hallstatt", "hungary", "budapest", "czech", "czechia", "prague",
  "slovenia", "croatia", "bosnia", "montenegro", "greece", "germany", "munich", "berlin",
];

const FUZZY_CORRECTIONS: Record<string, { query: string; countryCodes: string[]; label: string }> = {
  halstatt: { query: "Hallstatt Austria", countryCodes: ["at"], label: "Hallstatt, Austria" },
  hallstat: { query: "Hallstatt Austria", countryCodes: ["at"], label: "Hallstatt, Austria" },
  viena: { query: "Vienna Austria", countryCodes: ["at"], label: "Vienna, Austria" },
  wien: { query: "Vienna Austria", countryCodes: ["at"], label: "Vienna, Austria" },
  vie: { query: "Vienna Austria", countryCodes: ["at"], label: "Vienna, Austria" },
  budapesht: { query: "Budapest Hungary", countryCodes: ["hu"], label: "Budapest, Hungary" },
  budapeste: { query: "Budapest Hungary", countryCodes: ["hu"], label: "Budapest, Hungary" },
  praga: { query: "Prague Czechia", countryCodes: ["cz"], label: "Prague, Czechia" },
  prag: { query: "Prague Czechia", countryCodes: ["cz"], label: "Prague, Czechia" },
};

export function CaptureInbox({ tripId, onClose, initialInput }: CaptureInboxProps) {
  const { createPlace, places } = usePlacesStore();
  const { trips, activeTrip } = useTripsStore();
  const trip = trips.find((item) => item.id === tripId) ?? activeTrip;
  const [mode, setMode] = useState<CaptureMode>("paste");
  const [input, setInput] = useState(initialInput ?? "");
  const [singleInput, setSingleInput] = useState(initialInput ?? "");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [success, setSuccess] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [textareaCursor, setTextareaCursor] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const singleInputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const tripPlaces = useMemo(() => places.filter((place) => !tripId || place.tripId === tripId), [places, tripId]);
  const geocodeOptions = useMemo(() => buildGeocodeOptions(tripPlaces, trip), [tripPlaces, trip]);
  const lineCount = splitLines(mode === "paste" ? input : singleInput).length;
  const activeQuery = mode === "paste" ? currentLineAt(input, textareaCursor).trim() : singleInput.trim();
  const validCount = rows.filter((row) => row.status === "valid").length;
  const reviewCount = rows.filter((row) => row.status !== "valid").length;

  useEffect(() => {
    if (initialInput) {
      setInput(initialInput);
      setSingleInput(initialInput.split(/\r?\n/)[0] ?? initialInput);
    }
  }, [initialInput]);

  useEffect(() => {
    const query = activeQuery;
    if (query.length < 3 || rows.length) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSuggestionLoading(true);
      const fuzzy = getFuzzyCorrection(query);
      const searchQuery = fuzzy?.query ?? query;
      const searchOptions = fuzzy
        ? { ...geocodeOptions, viewbox: CENTRAL_EUROPE_VIEWBOX, countryCodes: fuzzy.countryCodes, limit: 7 }
        : { ...geocodeOptions, limit: 7 };
      const found = await geocodeQuery(searchQuery, searchOptions);
      const preferred = fuzzy?.countryCodes.map((code) => code.toUpperCase()) ?? geocodeOptions.preferredCountryCodes;
      setSuggestions(rankResults(query, found, geocodeOptions.near, preferred).slice(0, 5));
      setSuggestionIndex(0);
      setSuggestionLoading(false);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [activeQuery, rows.length, geocodeOptions]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    el.style.overflowY = el.scrollHeight > 120 ? "auto" : "hidden";
  }, [input, mode]);

  const handleParse = async () => {
    const lines = splitLines(mode === "paste" ? input : singleInput);
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
    if (mode === "paste") {
      const next = replaceCurrentLineAt(input, textareaCursor, replacement);
      setInput(next.value);
      setTextareaCursor(next.cursor);
      window.setTimeout(() => textareaRef.current?.setSelectionRange(next.cursor, next.cursor), 0);
    } else {
      setSingleInput(replacement);
    }
    setSuggestions([]);
    if (mode === "paste") textareaRef.current?.focus();
    else singleInputRef.current?.focus();
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
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
      } else if (event.key === "Escape") {
        event.preventDefault();
        setSuggestions([]);
      }
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void handleParse();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {[
          { value: "paste" as const, label: "Paste list" },
          { value: "search" as const, label: "Search one" },
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => {
              setMode(item.value);
              setSuggestions([]);
              window.setTimeout(() => item.value === "paste" ? textareaRef.current?.focus() : singleInputRef.current?.focus(), 0);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${mode === item.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="relative">
        {mode === "paste" ? (
          <>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                setTextareaCursor(event.target.selectionStart);
              }}
              onClick={(event) => setTextareaCursor(event.currentTarget.selectionStart)}
              onKeyUp={(event) => setTextareaCursor(event.currentTarget.selectionStart)}
              onSelect={(event) => setTextareaCursor(event.currentTarget.selectionStart)}
              onKeyDown={handleInputKeyDown}
              placeholder="Paste places, one per line..."
              rows={3}
              className="max-h-[120px] min-h-[86px] resize-none text-sm leading-5"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Hallstatt · Vienna · Budapest · Charles Bridge Prague
            </p>
          </>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={singleInputRef}
              value={singleInput}
              onChange={(event) => setSingleInput(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search for one place..."
              className="h-11 pl-9"
            />
          </div>
        )}
        <SuggestionDropdown
          loading={suggestionLoading}
          suggestions={suggestions}
          activeIndex={suggestionIndex}
          query={activeQuery}
          onSelect={acceptSuggestion}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" disabled={parsing} onClick={handleParse} className="flex-1">
          {parsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
          {parsing ? "Searching places..." : `Preview ${lineCount || 0} place${lineCount === 1 ? "" : "s"}`}
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => fileRef.current?.click()} aria-label="Upload screenshot" title="Upload screenshot">
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
        Paste one place per line. You’ll review matches before saving.
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
            {row.fuzzyMatched && <Badge variant="secondary" className="text-[11px]">Fuzzy match</Badge>}
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

function SuggestionDropdown({
  loading,
  suggestions,
  activeIndex,
  query,
  onSelect,
}: {
  loading: boolean;
  suggestions: GeocodingResult[];
  activeIndex: number;
  query: string;
  onSelect: (suggestion: GeocodingResult) => void;
}) {
  if (!loading && suggestions.length === 0) return null;
  return (
    <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-border bg-popover p-1 shadow-2xl">
      {loading && (
        <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Searching places...
        </div>
      )}
      {!loading && suggestions.slice(0, 5).map((suggestion, index) => {
        const fuzzy = fuzzyConfidence(query, suggestion) !== "exact";
        return (
          <button
            type="button"
            key={`${suggestion.lat}-${suggestion.lng}-${suggestion.displayName}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(suggestion)}
            className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${index === activeIndex ? "bg-muted" : "hover:bg-muted"}`}
          >
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{normalizePlaceName(suggestion.name ?? primaryDisplayName(suggestion))}</span>
              <span className="block truncate text-xs text-muted-foreground">{locationLine(suggestion)}</span>
            </span>
            <span className="flex flex-shrink-0 flex-col items-end gap-1">
              <Badge variant="secondary" className="text-[10px]">{displayType(suggestion.type)}</Badge>
              {fuzzy && <span className="text-[10px] font-medium text-primary">fuzzy</span>}
            </span>
          </button>
        );
      })}
    </div>
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
    const fuzzy = getFuzzyCorrection(search);
    const searchQuery = fuzzy?.query ?? search;
    const searchOptions = fuzzy
      ? { ...options, viewbox: CENTRAL_EUROPE_VIEWBOX, countryCodes: fuzzy.countryCodes, limit: 7 }
      : { ...options, limit: 7 };
    const preferred = fuzzy?.countryCodes.map((code) => code.toUpperCase()) ?? options.preferredCountryCodes;
    const found = rankResults(search, await geocodeQuery(searchQuery, searchOptions), options.near, preferred);
    if (!found.length) {
      return { id, input: line, query, status: "error", options: [], confidence: "low", message: "No match found. Edit this line and search again.", sourceUrl: first?.sourceUrl, sourceType: first?.sourceType };
    }

    const selected = found[0];
    const confidence = confidenceFor(search, selected, found, options.near, preferred);
    const typo = normalized(search) !== normalized(selected.name ?? primaryDisplayName(selected));
    const fuzzyMatched = Boolean(fuzzy);
    const status: ReviewStatus = confidence === "high" && !fuzzyMatched ? "valid" : "needs_review";
    const message = fuzzyMatched
      ? `Did you mean ${fuzzy!.label}?`
      : confidence === "high"
        ? "Matched automatically."
        : typo
          ? `Did you mean ${normalizePlaceName(selected.name ?? primaryDisplayName(selected))}?`
          : "Ambiguous match. Choose the correct result.";
    return buildRow(id, line, query, found, selected, confidence, message, first?.sourceUrl, first?.sourceType, existing, seen, status, fuzzyMatched);
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
  fallbackStatus?: ReviewStatus,
  fuzzyMatched = false
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
    fuzzyMatched,
  };
}

function buildGeocodeOptions(places: Place[], trip?: Trip | null): GeocodeOptions {
  const withCoords = places.filter((place) => typeof place.latitude === "number" && typeof place.longitude === "number");
  const countryCodes = Array.from(new Set(places.map(countryToCode).filter(Boolean))) as string[];
  const tripText = normalized([trip?.name, trip?.description, trip?.notes, trip?.timezone].filter(Boolean).join(" "));
  const centralEuropeish = countryCodes.some((code) => CENTRAL_EUROPE_CODES.includes(code)) || CENTRAL_EUROPE_HINTS.some((hint) => tripText.includes(hint));
  const europeish = centralEuropeish || countryCodes.some((code) => EUROPE_COUNTRY_CODES.includes(code));
  const near = withCoords.length
    ? {
        lat: withCoords.reduce((sum, place) => sum + place.latitude!, 0) / withCoords.length,
        lng: withCoords.reduce((sum, place) => sum + place.longitude!, 0) / withCoords.length,
      }
    : undefined;
  return {
    limit: 6,
    near,
    viewbox: centralEuropeish ? CENTRAL_EUROPE_VIEWBOX : europeish ? EUROPE_VIEWBOX : undefined,
    countryCodes: !centralEuropeish && countryCodes.length && countryCodes.length <= 3 ? countryCodes.map((code) => code.toLowerCase()) : undefined,
    preferredCountryCodes: centralEuropeish
      ? [...new Set([...countryCodes, ...CENTRAL_EUROPE_CODES])]
      : countryCodes.length
        ? countryCodes
        : undefined,
  };
}

function rankResults(query: string, results: GeocodingResult[], near?: { lat: number; lng: number }, preferredCountryCodes?: string[]) {
  return [...results].sort((a, b) => scoreResult(query, b, near, preferredCountryCodes) - scoreResult(query, a, near, preferredCountryCodes));
}

function scoreResult(query: string, result: GeocodingResult, near?: { lat: number; lng: number }, preferredCountryCodes?: string[]) {
  const name = result.name ?? primaryDisplayName(result);
  const distance = levenshtein.get(normalized(query), normalized(name));
  const maxLen = Math.max(normalized(query).length, normalized(name).length, 1);
  const fuzzy = 1 - distance / maxLen;
  const importance = result.importance ?? 0.3;
  const nearBonus = near ? Math.max(0, 1 - haversineKm(near.lat, near.lng, result.lat, result.lng) / 1200) * 0.15 : 0;
  const countryBonus = preferredCountryCodes?.includes(result.countryCode ?? "") ? 0.22 : 0;
  const centralBonus = CENTRAL_EUROPE_CODES.includes(result.countryCode ?? "") ? 0.08 : 0;
  const exactPrefixBonus = normalized(name).startsWith(normalized(query)) ? 0.18 : 0;
  return fuzzy * 0.58 + importance * 0.22 + nearBonus + countryBonus + centralBonus + exactPrefixBonus;
}

function confidenceFor(query: string, selected: GeocodingResult, options: GeocodingResult[], near?: { lat: number; lng: number }, preferredCountryCodes?: string[]): "high" | "medium" | "low" {
  const score = scoreResult(query, selected, near, preferredCountryCodes);
  const second = options[1] ? scoreResult(query, options[1], near, preferredCountryCodes) : 0;
  if (score > 0.82 && score - second > 0.08) return "high";
  if (score > 0.58) return "medium";
  return "low";
}

function getFuzzyCorrection(query: string) {
  const key = normalized(query);
  if (FUZZY_CORRECTIONS[key]) return FUZZY_CORRECTIONS[key];
  if (key.length < 4) return undefined;
  const best = Object.entries(FUZZY_CORRECTIONS)
    .map(([candidate, correction]) => ({ correction, distance: levenshtein.get(key, candidate), candidate }))
    .sort((a, b) => a.distance - b.distance)[0];
  if (!best) return undefined;
  const maxDistance = key.length <= 5 ? 1 : 2;
  return best.distance <= maxDistance ? best.correction : undefined;
}

function fuzzyConfidence(query: string, suggestion: GeocodingResult) {
  const name = normalized(suggestion.name ?? primaryDisplayName(suggestion));
  const search = normalized(query);
  if (!search || name === search || name.startsWith(search)) return "exact";
  return levenshtein.get(search, name) <= 2 ? "fuzzy" : "related";
}

function displayType(type?: string) {
  const value = normalized(type ?? "place");
  if (["city", "town", "village", "municipality"].includes(value)) return "city";
  if (value.includes("restaurant")) return "restaurant";
  if (value.includes("museum")) return "museum";
  if (value.includes("cafe") || value.includes("coffee")) return "cafe";
  if (value.includes("hotel")) return "hotel";
  if (value.includes("attraction") || value.includes("tourism") || value.includes("viewpoint")) return "attraction";
  if (value.includes("park") || value.includes("garden")) return "park";
  if (value.includes("bridge") || value.includes("castle") || value.includes("monument")) return "landmark";
  return "place";
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

function currentLineAt(value: string, cursor: number) {
  const start = value.lastIndexOf("\n", Math.max(0, cursor - 1)) + 1;
  const end = value.indexOf("\n", cursor);
  return value.slice(start, end === -1 ? value.length : end);
}

function replaceCurrentLineAt(value: string, cursor: number, replacement: string) {
  const start = value.lastIndexOf("\n", Math.max(0, cursor - 1)) + 1;
  const endIndex = value.indexOf("\n", cursor);
  const end = endIndex === -1 ? value.length : endIndex;
  const nextValue = `${value.slice(0, start)}${replacement}${value.slice(end)}`;
  return { value: nextValue, cursor: start + replacement.length };
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
    slovenia: "SI",
    croatia: "HR",
    "bosnia and herzegovina": "BA",
    bosnia: "BA",
    montenegro: "ME",
    greece: "GR",
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
