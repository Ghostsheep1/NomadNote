"use client";
import React, { useState, useCallback } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical, Wand2, Loader2, AlertTriangle, Lightbulb,
  Lock, Unlock, Clock, MapPin, ChevronDown, ChevronUp,
  Zap, Coffee, Moon, Sun, RefreshCw, Info,
} from "lucide-react";
import { cn, formatMinutes, CATEGORY_ICONS, CATEGORY_LABELS, formatDate } from "@/lib/utils";
import type { Place, Trip, ItineraryDay, ItineraryItem, ItineraryMode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildItinerary, suggestionToItinerary, analyzeTrip, travelTimePainScore, type TripInsight } from "@/features/itinerary/algorithm";
import { useTripsStore } from "@/store/trips";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { tripDuration } from "@/lib/utils";

interface ItineraryBuilderProps {
  trip: Trip;
  places: Place[];
}

const MODE_ICONS: Record<ItineraryMode, React.ReactNode> = {
  slow: <Coffee className="h-3.5 w-3.5" />,
  balanced: <Sun className="h-3.5 w-3.5" />,
  packed: <Zap className="h-3.5 w-3.5" />,
};

const MODE_LABELS: Record<ItineraryMode, string> = {
  slow: "Slow (6h/day)",
  balanced: "Balanced (8h/day)",
  packed: "Packed (11h/day)",
};

// ── Sortable item ────────────────────────────────────────────

function SortableItem({ item, place, onToggleLock }: {
  item: ItineraryItem;
  place?: Place;
  onToggleLock: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-card p-3 group",
        isDragging && "opacity-50 shadow-xl ring-2 ring-primary/30",
        item.locked && "border-primary/30 bg-primary/5"
      )}
    >
      <div className="drag-handle" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {item.startTime && (
            <span className="text-xs font-mono-custom text-muted-foreground w-10 flex-shrink-0">
              {item.startTime}
            </span>
          )}
          <span className="text-base flex-shrink-0">{place ? CATEGORY_ICONS[place.category] : "📍"}</span>
          <span className="text-sm font-medium truncate">{place?.title ?? item.placeId}</span>
        </div>
        <div className="flex items-center gap-2 ml-12 mt-0.5">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatMinutes(item.duration)}
          </span>
          {(item.travelTimeFromPrevious ?? 0) > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              +{formatMinutes(item.travelTimeFromPrevious ?? 0)} walk
            </span>
          )}
        </div>
      </div>

      <button
        onClick={() => onToggleLock(item.id)}
        className={cn(
          "p-1 rounded transition-colors opacity-0 group-hover:opacity-100",
          item.locked ? "opacity-100 text-primary" : "text-muted-foreground"
        )}
      >
        {item.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

// ── Day column ───────────────────────────────────────────────

function DayColumn({ day, places, onReorder, onToggleLock, expanded, onToggle }: {
  day: ItineraryDay;
  places: Place[];
  onReorder: (dayDate: string, items: ItineraryItem[]) => void;
  onToggleLock: (dayDate: string, itemId: string) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const totalMin = day.items.reduce((s, i) => s + i.duration + (i.travelTimeFromPrevious ?? 0), 0);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = day.items.findIndex((i) => i.id === active.id);
    const newIdx = day.items.findIndex((i) => i.id === over.id);
    onReorder(day.date, arrayMove(day.items, oldIdx, newIdx));
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 bg-card hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">D{day.dayNumber}</span>
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">
              {day.theme ?? `Day ${day.dayNumber}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {day.date && day.date.length === 10 ? formatDate(day.date, "EEE, MMM d") : day.date} · {day.items.length} places · {formatMinutes(totalMin)}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 flex flex-col gap-2 border-t border-border">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={day.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  {day.items.map((item) => (
                    <SortableItem
                      key={item.id}
                      item={item}
                      place={places.find((p) => p.id === item.placeId)}
                      onToggleLock={(id) => onToggleLock(day.date, id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main builder ─────────────────────────────────────────────

export function ItineraryBuilder({ trip, places }: ItineraryBuilderProps) {
  const [mode, setMode] = useState<ItineraryMode>(trip.itineraryMode ?? "balanced");
  const [days, setDays] = useState<ItineraryDay[]>(trip.itinerary ?? []);
  const [building, setBuilding] = useState(false);
  const [insights, setInsights] = useState<TripInsight[]>([]);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [showInsights, setShowInsights] = useState(false);
  const { saveItinerary } = useTripsStore();

  const numDays = tripDuration(trip.startDate, trip.endDate) || Math.max(1, Math.ceil(places.length / 4));

  const handleBuild = useCallback(async () => {
    setBuilding(true);
    await new Promise((r) => setTimeout(r, 400)); // Slight delay for UX

    const suggestion = buildItinerary(places, numDays, mode, new Map(), trip.startDate);
    const newDays = suggestionToItinerary(suggestion);
    setDays(newDays);
    await saveItinerary(trip.id, newDays);

    const tripInsights = analyzeTrip(places, numDays);
    setInsights(tripInsights);

    // Expand first day by default
    if (newDays.length > 0) setExpandedDays(new Set([newDays[0].date]));

    const warns = suggestion.warnings;
    if (warns.length) toast.warning(warns[0]);
    else toast.success(`Itinerary built! ${newDays.length} days, ${suggestion.stats.totalPlaces} places`);

    setBuilding(false);
  }, [places, numDays, mode, trip, saveItinerary]);

  const handleReorder = (dayDate: string, items: ItineraryItem[]) => {
    setDays((prev) => prev.map((d) => d.date === dayDate ? { ...d, items } : d));
  };

  const handleToggleLock = (dayDate: string, itemId: string) => {
    setDays((prev) =>
      prev.map((d) =>
        d.date === dayDate
          ? { ...d, items: d.items.map((i) => i.id === itemId ? { ...i, locked: !i.locked } : i) }
          : d
      )
    );
  };

  const handleSave = async () => {
    await saveItinerary(trip.id, days);
    toast.success("Itinerary saved");
  };

  const toggleDay = (date: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  };

  const painScore = days.length
    ? travelTimePainScore([])
    : 0;

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Builder controls */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Auto-build itinerary</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {places.filter((p) => p.latitude && p.longitude).length} of {places.length} places have coordinates · {numDays} days
            </p>
          </div>
          <Button
            onClick={() => setShowInsights(!showInsights)}
            variant="ghost"
            size="sm"
            className="text-xs"
          >
            <Lightbulb className="h-3.5 w-3.5 mr-1" />
            Insights
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["slow", "balanced", "packed"] as ItineraryMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                mode === m
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {MODE_ICONS[m]} {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        <div className="grid gap-2 sm:flex">
          <Button onClick={handleBuild} disabled={building || places.length === 0} className="flex-1">
            {building ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Building…</>
            ) : days.length > 0 ? (
              <><RefreshCw className="h-4 w-4 mr-2" />Rebuild</>
            ) : (
              <><Wand2 className="h-4 w-4 mr-2" />Build Itinerary</>
            )}
          </Button>
          {days.length > 0 && (
            <Button variant="outline" onClick={handleSave} size="default" className="sm:w-auto">
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Insights panel */}
      <AnimatePresence>
        {showInsights && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="flex flex-col gap-2 p-4 rounded-xl bg-accent/10 border border-accent/20">
              <p className="text-xs font-semibold text-accent-foreground/80 uppercase tracking-wide">Trip Insights</p>
              {insights.length === 0 && <p className="text-xs text-muted-foreground">Build an itinerary first to see insights.</p>}
              {insights.map((ins, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-base flex-shrink-0">{ins.icon}</span>
                  <div>
                    <p className="text-xs font-medium">{ins.title}</p>
                    <p className="text-xs text-muted-foreground">{ins.description}</p>
                  </div>
                </div>
              ))}
              {days.length > 0 && (
                <div className="flex items-center gap-2 mt-1 pt-2 border-t border-accent/20">
                  <span className="text-xs text-muted-foreground">Travel pain score:</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 10 }, (_, i) => (
                      <div key={i} className={cn("h-2 w-2 rounded-full", i < painScore ? "bg-destructive" : "bg-muted")} />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{painScore}/10</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Day columns */}
      {days.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold">{days.length}-day itinerary</h3>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setExpandedDays(new Set(days.map((d) => d.date)))}>
                Expand all
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setExpandedDays(new Set())}>
                Collapse
              </Button>
            </div>
          </div>

          {days.map((day) => (
            <DayColumn
              key={day.date}
              day={day}
              places={places}
              onReorder={handleReorder}
              onToggleLock={handleToggleLock}
              expanded={expandedDays.has(day.date)}
              onToggle={() => toggleDay(day.date)}
            />
          ))}
        </div>
      )}

      {places.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <Wand2 className="h-8 w-8 mx-auto mb-3 opacity-30" />
          Add places to this trip before building an itinerary
        </div>
      )}
    </div>
  );
}
