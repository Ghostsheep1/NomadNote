"use client";

import { CalendarDays, Database, MapPin, ShieldCheck, Sparkles, Upload } from "lucide-react";
import type { ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import type { Trip } from "@/lib/types";

interface HomeDashboardProps {
  trips: Trip[];
  onCreateTrip: () => void;
  onImportTrip: () => void;
}

export function HomeDashboard({ trips, onCreateTrip, onImportTrip }: HomeDashboardProps) {
  const placeCount = useLiveQuery(() => db.places.count(), []) ?? 0;
  const favoriteCount = useLiveQuery(() => db.places.where("favorite").equals(1).count(), []) ?? 0;
  const itineraryCount = trips.filter((trip) => trip.itinerary?.length).length;
  const activeTrips = trips.filter((trip) => !trip.archived).length;

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-border/80 bg-card shadow-sm">
      <div className="absolute inset-0 travel-hero-surface" />
      <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
        <div className="min-w-0">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/70 px-3 py-1 text-xs font-semibold text-primary shadow-sm backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5" />
            Local-first, no-login travel planning
          </div>
          <h1 className="max-w-2xl font-display text-4xl font-bold leading-[0.95] tracking-normal sm:text-5xl">
            Plan the trip before the itinerary ruins it.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Capture everything, then let Trip Stress Radar catch overload, pin debt, rain risk, and backtracking before your vacation turns into homework.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button onClick={onCreateTrip} className="nomad-action nomad-action-primary">
              <Sparkles className="h-4 w-4" />
              New trip
            </button>
            <button onClick={onImportTrip} className="nomad-action">
              <Upload className="h-4 w-4" />
              Import JSON
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 self-end">
          <MetricCard icon={<CalendarDays />} label="Active trips" value={activeTrips} tone="primary" />
          <MetricCard icon={<MapPin />} label="Saved places" value={placeCount} tone="secondary" />
          <MetricCard icon={<Sparkles />} label="Favorites" value={favoriteCount} tone="accent" />
          <MetricCard icon={<Database />} label="Itineraries" value={itineraryCount} tone="muted" />
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: "primary" | "secondary" | "accent" | "muted";
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/75 p-4 shadow-sm backdrop-blur">
      <div
        className={cn(
          "mb-3 flex h-9 w-9 items-center justify-center rounded-xl [&>svg]:h-4 [&>svg]:w-4",
          tone === "primary" && "bg-primary/10 text-primary",
          tone === "secondary" && "bg-secondary/10 text-secondary",
          tone === "accent" && "bg-accent/20 text-accent-foreground",
          tone === "muted" && "bg-muted text-muted-foreground"
        )}
      >
        {icon}
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
    </div>
  );
}
