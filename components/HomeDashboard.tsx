"use client";

import { CalendarDays, MapPin, ShieldCheck, Sparkles, Upload, Route } from "lucide-react";
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
    <section className="atlas-card relative overflow-hidden rounded-md">
      <div className="absolute inset-0 travel-hero-surface" />
      <div className="absolute right-5 top-5 hidden h-28 w-28 rotate-6 border-2 border-foreground bg-accent text-accent-foreground lg:block">
        <div className="grid h-full place-items-center p-3 text-center font-mono-custom text-[10px] font-bold uppercase tracking-[0.16em]">
          Anti itinerary mode
        </div>
      </div>
      <div className="relative grid gap-5 p-4 sm:gap-6 sm:p-7 lg:grid-cols-[1.12fr_0.88fr] lg:p-8">
        <div className="min-w-0">
          <div className="mb-4 inline-flex max-w-full items-center gap-2 rounded-md border-2 border-foreground bg-accent px-3 py-1 font-mono-custom text-[10px] font-bold uppercase tracking-[0.14em] text-accent-foreground shadow-[3px_3px_0_hsl(var(--foreground))] sm:mb-5">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="truncate">Private field atlas by Henrique Ribeiro</span>
          </div>
          <h1 className="max-w-2xl font-display text-[2.75rem] font-black leading-[0.86] tracking-normal sm:text-6xl md:text-7xl">
            Build trips like a field report.
          </h1>
          <p className="mt-4 max-w-xl text-sm font-medium leading-6 text-foreground/75 sm:text-base">
            Save the messy links, pins, hotels, and half-ideas. NomadNote turns them into a private map intelligence board with stress checks before the trip gets too loud.
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

        <div className="grid grid-cols-2 gap-2 self-end sm:gap-3 lg:pt-24">
          <MetricCard icon={<CalendarDays />} label="Active trips" value={activeTrips} tone="primary" />
          <MetricCard icon={<MapPin />} label="Saved places" value={placeCount} tone="secondary" />
          <MetricCard icon={<Sparkles />} label="Favorites" value={favoriteCount} tone="accent" />
          <MetricCard icon={<Route />} label="Itineraries" value={itineraryCount} tone="muted" />
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
    <div className="rounded-md border-2 border-foreground bg-card/90 p-3 shadow-[4px_4px_0_hsl(var(--foreground))] backdrop-blur sm:p-4">
      <div
        className={cn(
          "mb-3 flex h-9 w-9 items-center justify-center rounded-md border-2 border-foreground [&>svg]:h-4 [&>svg]:w-4",
          tone === "primary" && "bg-primary text-primary-foreground",
          tone === "secondary" && "bg-secondary text-secondary-foreground",
          tone === "accent" && "bg-accent text-accent-foreground",
          tone === "muted" && "bg-muted text-foreground"
        )}
      >
        {icon}
      </div>
      <div className="text-2xl font-black tabular-nums sm:text-3xl">{value}</div>
      <div className="atlas-label">{label}</div>
    </div>
  );
}
