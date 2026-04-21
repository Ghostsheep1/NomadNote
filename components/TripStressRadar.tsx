"use client";

import { AlertTriangle, CloudRain, Compass, MapPinned, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, haversineKm } from "@/lib/utils";
import type { Place, Trip } from "@/lib/types";

interface TripStressRadarProps {
  trip: Trip;
  places: Place[];
}

interface StressFactor {
  label: string;
  value: number;
  icon: React.ReactNode;
  note: string;
}

export function TripStressRadar({ trip, places }: TripStressRadarProps) {
  const radar = analyzeTripStress(trip, places);

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-card shadow-sm">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,hsl(var(--primary)/0.18),transparent_34%),radial-gradient(circle_at_90%_30%,hsl(var(--secondary)/0.14),transparent_32%)]" />
      <div className="relative grid gap-5 p-4 sm:p-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/75 px-3 py-1 text-xs font-bold text-primary shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            NomadNote exclusive
          </div>
          <h2 className="font-display text-2xl font-bold leading-tight">Trip Stress Radar</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Most planners help you add more. This one tells you when the plan will actually feel bad, then gives you a rescue move.
          </p>

          <div className="mt-5 flex items-center gap-4">
            <StressDial score={radar.score} />
            <div className="min-w-0">
              <Badge variant={radar.score >= 68 ? "warning" : radar.score >= 38 ? "secondary" : "success"}>
                {radar.label}
              </Badge>
              <p className="mt-2 text-sm font-semibold">{radar.headline}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{radar.rescue}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
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
                    factor.value >= 70 ? "bg-destructive" : factor.value >= 40 ? "bg-accent" : "bg-secondary"
                  )}
                  style={{ width: `${factor.value}%` }}
                />
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{factor.note}</p>
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
      className="grid h-24 w-24 flex-shrink-0 place-items-center rounded-full p-2"
      style={{
        background: `conic-gradient(hsl(var(--primary)) ${angle}deg, hsl(var(--muted)) ${angle}deg)`,
      }}
    >
      <div className="grid h-full w-full place-items-center rounded-full bg-card shadow-inner">
        <div className="text-center">
          <div className="text-2xl font-black tabular-nums">{score}</div>
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
  const rainyRatio = places.filter((place) => place.indoorOutdoor === "indoor" || place.indoorOutdoor === "both").length / total;
  const mustSeeRatio = places.filter((place) => place.priority <= 2 || place.favorite).length / total;
  const neighborhoods = new Set(places.map((place) => place.neighborhood || place.city).filter(Boolean));
  const itineraryDays = trip.itinerary?.length ?? 0;
  const plannedStops = trip.itinerary?.reduce((sum, day) => sum + day.items.length, 0) ?? 0;
  const averageStops = itineraryDays ? plannedStops / itineraryDays : places.length / Math.max(1, estimatedDays(trip));
  const spreadKm = estimateSpreadKm(mappedPlaces);

  const overload = clamp((averageStops - 2.5) * 28);
  const pinDebt = clamp((1 - mappedRatio) * 100);
  const weatherRisk = clamp((0.45 - rainyRatio) * 170);
  const fomoRisk = clamp((mustSeeRatio - 0.35) * 125);
  const spreadRisk = clamp((neighborhoods.size - 2) * 18 + Math.max(0, spreadKm - 8) * 2);
  const score = Math.round(clamp(overload * 0.33 + pinDebt * 0.2 + weatherRisk * 0.16 + fomoRisk * 0.16 + spreadRisk * 0.15));

  const worst = [
    { key: "overload", value: overload },
    { key: "pinDebt", value: pinDebt },
    { key: "weatherRisk", value: weatherRisk },
    { key: "fomoRisk", value: fomoRisk },
    { key: "spreadRisk", value: spreadRisk },
  ].sort((a, b) => b.value - a.value)[0]?.key;

  const rescue = {
    overload: "Rescue move: make one low-priority stop a backup for each packed day.",
    pinDebt: "Rescue move: pin unmapped saves before trusting the itinerary builder.",
    weatherRisk: "Rescue move: add two indoor backups near your densest neighborhood.",
    fomoRisk: "Rescue move: choose one anchor must-see per day and let the rest orbit it.",
    spreadRisk: "Rescue move: split days by neighborhood instead of category.",
  }[worst ?? "overload"];

  return {
    score,
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
      },
      {
        label: "Pin debt",
        value: Math.round(pinDebt),
        icon: <MapPinned />,
        note: `${mappedPlaces.length}/${places.length} places have coordinates.`,
      },
      {
        label: "Rain risk",
        value: Math.round(weatherRisk),
        icon: <CloudRain />,
        note: rainyRatio < 0.35 ? "You need more indoor fallbacks." : "There are enough weather backups.",
      },
      {
        label: "FOMO load",
        value: Math.round(fomoRisk),
        icon: <AlertTriangle />,
        note: mustSeeRatio > 0.45 ? "Too many places are marked essential." : "Priorities are nicely ranked.",
      },
      {
        label: "City spread",
        value: Math.round(spreadRisk),
        icon: <Compass />,
        note: neighborhoods.size > 2 ? `${neighborhoods.size} clusters can create backtracking.` : "Neighborhood spread is contained.",
      },
      {
        label: "Resilience",
        value: Math.round(100 - score),
        icon: <ShieldCheck />,
        note: "How well the trip survives delays, weather, and tired feet.",
      },
    ],
  };
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
