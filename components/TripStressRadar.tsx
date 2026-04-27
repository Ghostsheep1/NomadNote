"use client";

import { AlertTriangle, CalendarClock, CloudRain, Compass, MapPinned, Route, Sparkles, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn, haversineKm } from "@/lib/utils";
import type { Place, Trip } from "@/lib/types";

interface TripStressRadarProps {
  trip: Trip;
  places: Place[];
  onAction?: (action: StressAction) => void;
}

export type StressAction = "coordinates" | "indoor" | "essentials" | "neighborhoods" | "reservations" | "transit";

interface StressFactor {
  label: string;
  value: number;
  icon: ReactNode;
  note: string;
  definition: string;
  action: StressAction;
  actionLabel: string;
  positive?: boolean;
  actionDisabled?: boolean;
}

export function TripStressRadar({ trip, places, onAction }: TripStressRadarProps) {
  const radar = analyzeTripStress(trip, places);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card shadow-sm sm:rounded-[28px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,hsl(var(--primary)/0.18),transparent_34%),radial-gradient(circle_at_90%_30%,hsl(var(--secondary)/0.14),transparent_32%)]" />
      <div className="relative grid gap-4 p-3 sm:gap-5 sm:p-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/75 px-3 py-1 text-xs font-bold text-primary shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            NomadNote exclusive
          </div>
          <h2 className="font-display text-[1.8rem] font-bold leading-none sm:text-3xl">Trip Stress Radar</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Most planners help you add more. This one spots what will make the trip feel bad, then gives you the next repair.
          </p>

          <div className="mt-5 flex flex-col gap-4 min-[380px]:flex-row min-[380px]:items-center">
            <StressDial score={radar.score} />
            <div className="min-w-0">
              <Badge variant={radar.score >= 68 ? "warning" : radar.score >= 38 ? "secondary" : "success"}>
                {radar.label}
              </Badge>
              <p className="mt-2 text-sm font-semibold">{radar.headline}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{radar.rescue}</p>
              <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {radar.confidence} confidence · updated {radar.lastUpdated}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          {radar.factors.map((factor) => (
            <div key={factor.label} className="rounded-2xl border border-border/75 bg-background/75 p-3 shadow-sm backdrop-blur">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">
                    {factor.icon}
                  </span>
                  {factor.label}
                </div>
                <span className="text-sm font-bold tabular-nums">{factor.value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    factor.positive
                      ? factor.value >= 70 ? "bg-secondary" : factor.value >= 40 ? "bg-accent" : "bg-destructive"
                      : factor.value >= 70 ? "bg-destructive" : factor.value >= 40 ? "bg-accent" : "bg-secondary"
                  )}
                  style={{ width: `${factor.value}%` }}
                />
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground" title={factor.definition}>{factor.note}</p>
              <button
                type="button"
                onClick={() => onAction?.(factor.action)}
                disabled={factor.actionDisabled}
                className="mt-3 inline-flex min-h-8 items-center rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 disabled:cursor-default disabled:opacity-55 disabled:hover:border-border disabled:hover:bg-card"
              >
                {factor.actionLabel}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StressDial({ score }: { score: number }) {
  const angle = Math.round((score / 100) * 360);
  return (
    <div
      className="grid h-20 w-20 flex-shrink-0 place-items-center rounded-full p-2 sm:h-24 sm:w-24"
      style={{
        background: `conic-gradient(hsl(var(--primary)) ${angle}deg, hsl(var(--muted)) ${angle}deg)`,
      }}
    >
      <div className="grid h-full w-full place-items-center rounded-full bg-card shadow-inner">
        <div className="text-center">
          <div className="text-xl font-black tabular-nums sm:text-2xl">{score}</div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">stress</div>
        </div>
      </div>
    </div>
  );
}

function analyzeTripStress(trip: Trip, places: Place[]) {
  const total = places.length || 1;
  const mappedPlaces = places.filter((place) => typeof place.latitude === "number" && typeof place.longitude === "number");
  const mappedRatio = mappedPlaces.length / total;
  const indoorCount = places.filter((place) => place.indoorOutdoor === "indoor" || place.indoorOutdoor === "both").length;
  const rainyRatio = indoorCount / total;
  const essentialCount = places.filter((place) => place.priority <= 2 || place.favorite).length;
  const tripDays = estimatedDays(trip);
  const mustSeeRatio = essentialCount / total;
  const neighborhoods = new Set(places.map((place) => place.neighborhood || place.city).filter(Boolean));
  const itineraryDays = trip.itinerary?.length ?? 0;
  const plannedStops = trip.itinerary?.reduce((sum, day) => sum + day.items.length, 0) ?? 0;
  const averageStops = itineraryDays ? plannedStops / itineraryDays : places.length / Math.max(1, estimatedDays(trip));
  const spreadKm = estimateSpreadKm(mappedPlaces);
  const reservationRisk = estimateReservationRisk(places);
  const transitComplexity = clamp((neighborhoods.size - Math.max(2, tripDays)) * 15 + Math.max(0, spreadKm - 10) * 2.5 + (mappedRatio < 0.7 ? 16 : 0));

  const overload = clamp((averageStops - 2.5) * 28);
  const pinDebt = clamp((1 - mappedRatio) * 100);
  const weatherRisk = clamp((0.45 - rainyRatio) * 170);
  const fomoRisk = places.length < 4 ? 0 : clamp((essentialCount - Math.max(1, tripDays)) * 18 + Math.max(0, mustSeeRatio - 0.5) * 55);
  const spreadRisk = clamp((neighborhoods.size - 2) * 18 + Math.max(0, spreadKm - 8) * 2);
  const score = Math.round(clamp(overload * 0.25 + pinDebt * 0.18 + weatherRisk * 0.14 + fomoRisk * 0.13 + spreadRisk * 0.12 + reservationRisk * 0.08 + transitComplexity * 0.1));
  const confidence = getRadarConfidence(trip, places);
  const lastUpdated = formatRelativeUpdate(Math.max(trip.updatedAt, ...places.map((place) => place.updatedAt || 0)));

  const worst = [
    { key: "overload", value: overload },
    { key: "mapReadiness", value: pinDebt },
    { key: "weatherRisk", value: weatherRisk },
    { key: "fomoRisk", value: fomoRisk },
    { key: "spreadRisk", value: spreadRisk },
    { key: "reservationRisk", value: reservationRisk },
    { key: "transitComplexity", value: transitComplexity },
  ].sort((a, b) => b.value - a.value)[0]?.key;

  const rescue = {
    overload: "Rescue move: make one low-priority stop a backup for each packed day.",
    mapReadiness: "Rescue move: pin unmapped saves before trusting the itinerary builder.",
    weatherRisk: `Rescue move: add ${Math.max(1, Math.ceil(tripDays / 3))} indoor backup${tripDays > 3 ? "s" : ""} near your densest neighborhood.`,
    fomoRisk: "Rescue move: choose one anchor must-see per day and let the rest orbit it.",
    spreadRisk: "Rescue move: split days by neighborhood instead of category.",
    reservationRisk: "Rescue move: mark ticketed dinners, shows, and tours before you build the final day plan.",
    transitComplexity: "Rescue move: make each day a walkable neighborhood loop before adding cross-town stops.",
  }[worst ?? "overload"];

  return {
    score,
    confidence,
    lastUpdated,
    label: score >= 68 ? "High friction" : score >= 38 ? "Needs tuning" : "Trip feels sane",
    headline:
      score >= 68
        ? "This plan is drifting into vacation homework."
        : score >= 38
          ? "Good trip, a few reality checks needed."
          : "This looks like a plan a human could enjoy.",
    rescue,
    factors: [
      {
        label: "Overload",
        value: Math.round(overload),
        icon: <Zap />,
        note: averageStops >= 4 ? `${averageStops.toFixed(1)} stops per day is a lot.` : "Daily density looks humane.",
        definition: "How packed each planned day feels after duration and travel time.",
        action: "essentials",
        actionLabel: overload > 0 ? "Thin busy days" : "Keep days humane",
        actionDisabled: overload === 0,
      },
      {
        label: "Map readiness",
        value: Math.round(100 - pinDebt),
        icon: <MapPinned />,
        note: `${mappedPlaces.length}/${places.length} places have coordinates.`,
        definition: "How many saved places have enough map data for routing and clustering.",
        action: "coordinates",
        actionLabel: pinDebt > 0 ? "Fix coordinates" : "Review locations",
        positive: true,
      },
      {
        label: "Rain risk",
        value: Math.round(weatherRisk),
        icon: <CloudRain />,
        note: rainyRatio < 0.35 ? `You have ${indoorCount}; aim for at least ${Math.max(1, Math.ceil(tripDays / 3))} indoor backup${tripDays > 3 ? "s" : ""}.` : "There are enough weather backups.",
        definition: "Whether rainy or low-energy days have indoor alternatives nearby.",
        action: "indoor",
        actionLabel: weatherRisk > 0 ? "Add indoor backups" : "Maintain backups",
      },
      {
        label: "Anchor pressure",
        value: Math.round(fomoRisk),
        icon: <AlertTriangle />,
        note: fomoRisk > 40 ? `${essentialCount} favorites or anchors may be too many for ${tripDays} day${tripDays === 1 ? "" : "s"}.` : "Priorities are nicely ranked.",
        definition: "How many places are competing to be non-negotiable anchors.",
        action: "essentials",
        actionLabel: "Reduce essentials",
      },
      {
        label: "City spread",
        value: Math.round(spreadRisk),
        icon: <Compass />,
        note: neighborhoods.size > 2 ? `${neighborhoods.size} clusters can create backtracking.` : "Neighborhood spread is contained.",
        definition: "How far apart the saved neighborhoods and mapped pins are.",
        action: "neighborhoods",
        actionLabel: "See clusters",
      },
      {
        label: "Reservation risk",
        value: Math.round(reservationRisk),
        icon: <CalendarClock />,
        note: reservationRisk > 35 ? "Likely booking-sensitive stops need confirmation." : "Few stops look reservation-sensitive.",
        definition: "Places likely to need tickets, bookings, or timed entry.",
        action: "reservations",
        actionLabel: "Check bookings",
      },
      {
        label: "Transit complexity",
        value: Math.round(transitComplexity),
        icon: <Route />,
        note: transitComplexity > 45 ? "Cross-town clusters may make days fragile." : "The route shape is workable.",
        definition: "A rough warning for far-apart clusters, missing pins, and backtracking.",
        action: "transit",
        actionLabel: "Make loops",
      },
    ] satisfies StressFactor[],
  };
}

function getRadarConfidence(trip: Trip, places: Place[]) {
  const hasDates = Boolean(trip.startDate && trip.endDate);
  const mappedCount = places.filter((place) => typeof place.latitude === "number" && typeof place.longitude === "number").length;
  if (!hasDates || places.length < 3) return "Low";
  if (mappedCount < Math.ceil(places.length * 0.6)) return "Medium";
  return "High";
}

function formatRelativeUpdate(timestamp: number) {
  if (!timestamp) return "just now";
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function estimateReservationRisk(places: Place[]) {
  if (!places.length) return 0;
  const risky = places.filter((place) => {
    const haystack = `${place.title} ${place.notes ?? ""} ${place.tags.join(" ")} ${place.category}`.toLowerCase();
    return (
      /reservation|booking|ticket|timed|show|tour|omakase|tasting|requires/.test(haystack) ||
      place.category === "restaurant" && (place.bestTimeOfDay === "evening" || place.priority <= 2)
    );
  }).length;
  return clamp((risky / places.length) * 100);
}

function estimatedDays(trip: Trip) {
  if (!trip.startDate || !trip.endDate) return 3;
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return Math.max(1, days);
}

function estimateSpreadKm(places: Place[]) {
  if (places.length < 2) return 0;
  let max = 0;
  for (let i = 0; i < places.length; i += 1) {
    for (let j = i + 1; j < places.length; j += 1) {
      max = Math.max(max, haversineKm(places[i].latitude!, places[i].longitude!, places[j].latitude!, places[j].longitude!));
    }
  }
  return max;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}
