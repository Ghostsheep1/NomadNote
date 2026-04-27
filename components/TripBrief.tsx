"use client";

import { AlertTriangle, BadgeDollarSign, CloudRain, Compass, Heart, MapPinned, Plus, Route, Star } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TripStressRadar, type StressAction } from "@/components/TripStressRadar";
import { cn } from "@/lib/utils";
import type { Place, Trip } from "@/lib/types";

interface TripBriefProps {
  trip: Trip;
  places: Place[];
}

export function TripBrief({ trip, places }: TripBriefProps) {
  const [focus, setFocus] = useState<StressAction | null>(null);
  const total = places.length;
  const visited = places.filter((place) => place.visited).length;
  const favorites = places.filter((place) => place.favorite).length;
  const mustSees = places.filter((place) => place.priority <= 2 || place.favorite).length;
  const free = places.filter((place) => place.isFree || place.priceLevel === "free").length;
  const rainy = places.filter((place) => place.indoorOutdoor === "indoor" || place.indoorOutdoor === "both").length;
  const mapped = places.filter((place) => typeof place.latitude === "number" && typeof place.longitude === "number").length;
  const progress = total ? Math.round((visited / total) * 100) : 0;
  const plannedStops = trip.itinerary?.reduce((sum, day) => sum + day.items.length, 0) ?? 0;
  const itineraryDays = trip.itinerary?.length ?? 0;
  const averageStops = itineraryDays ? plannedStops / itineraryDays : 0;
  const overloaded = averageStops >= 5;

  const topNeighborhoods = Object.entries(
    places.reduce<Record<string, number>>((acc, place) => {
      const key = place.neighborhood || place.city || "Unsorted";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <section className="grid gap-3 border-b border-border bg-background px-3 py-3 sm:px-4">
      <TripStressRadar trip={trip} places={places} onAction={setFocus} />
      {focus && <RadarActionPanel action={focus} places={places} onClose={() => setFocus(null)} />}

      <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
          <div className="mb-3 flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Travel brief</p>
              <h2 className="font-display text-2xl font-semibold leading-none">What this trip is telling you</h2>
            </div>
            <Badge variant={overloaded ? "warning" : "success"}>
              {overloaded ? "Packed" : "Healthy pace"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <BriefMetric icon={<Star />} label="Must-sees" value={mustSees} />
            <BriefMetric icon={<Heart />} label="Favorites" value={favorites} />
            <BriefMetric icon={<BadgeDollarSign />} label="Free spots" value={free} />
            <BriefMetric icon={<CloudRain />} label="Rain backups" value={rainy} />
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Visited progress</span>
              <span>{visited}/{total} places</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <Signal
            icon={<MapPinned />}
            title={`${mapped}/${total || 0} places mapped`}
            body={mapped === total ? "Your map is ready for routing and neighborhood planning." : "Add pins to unmapped saves for better itinerary grouping."}
            tone={mapped === total ? "good" : "watch"}
          />
          <Signal
            icon={overloaded ? <AlertTriangle /> : <Route />}
            title={overloaded ? "Overload risk" : "Route looks workable"}
            body={overloaded ? "Average day has five or more stops. Move one low-priority place into a backup list." : "Your itinerary density is reasonable for a real travel day."}
            tone={overloaded ? "watch" : "good"}
          />
          {topNeighborhoods.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Compass className="h-4 w-4 text-primary" />
                Neighborhood clusters
              </div>
              <div className="flex flex-wrap gap-2">
                {topNeighborhoods.map(([name, count]) => (
                  <Badge key={name} variant="secondary">
                    {name} · {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function RadarActionPanel({ action, places, onClose }: { action: StressAction; places: Place[]; onClose: () => void }) {
  const missingCoords = places.filter((place) => typeof place.latitude !== "number" || typeof place.longitude !== "number");
  const indoor = places.filter((place) => place.indoorOutdoor === "indoor" || place.indoorOutdoor === "both");
  const essentials = places.filter((place) => place.priority <= 2 || place.favorite).slice(0, 8);
  const clusters = Object.entries(
    places.reduce<Record<string, Place[]>>((acc, place) => {
      const key = place.neighborhood || place.city || "Unsorted";
      acc[key] = [...(acc[key] ?? []), place];
      return acc;
    }, {})
  ).sort((a, b) => b[1].length - a[1].length);
  const reservations = places.filter((place) => /reservation|booking|ticket|timed|tour|show|requires/i.test(`${place.title} ${place.notes ?? ""} ${place.tags.join(" ")}`) || (place.category === "restaurant" && place.bestTimeOfDay === "evening"));

  const content = {
    coordinates: {
      title: "Places missing coordinates",
      body: missingCoords.length ? "Add an address or pin before asking NomadNote to make a realistic route." : "Every place is map-ready.",
      list: missingCoords.map((place) => place.title),
      action: "Add place details",
    },
    indoor: {
      title: "Rainy-day backup builder",
      body: indoor.length ? `${indoor.length} indoor backup${indoor.length === 1 ? "" : "s"} saved. Add museum, cafe, gallery, or bookstore options near your busiest cluster.` : "No indoor backups yet. Add museum, cafe, gallery, or bookstore options before the weather decides for you.",
      list: ["Museum", "Cafe", "Gallery", "Bookstore"],
      action: "Add indoor place",
    },
    essentials: {
      title: "Favorites and anchors",
      body: essentials.length ? "Keep one or two anchors per day, then let the itinerary flex around them." : "No overloaded anchors yet.",
      list: essentials.map((place) => place.title),
      action: "Review anchors",
    },
    neighborhoods: {
      title: "Neighborhood clusters",
      body: "Use the largest clusters as walkable day loops before adding cross-town stops.",
      list: clusters.slice(0, 6).map(([name, items]) => `${name} · ${items.length} place${items.length === 1 ? "" : "s"}`),
      action: "Plan loops",
    },
    reservations: {
      title: "Booking-sensitive stops",
      body: reservations.length ? "These look like places where a reservation, ticket, or timed entry could matter." : "No obvious booking-sensitive stops found.",
      list: reservations.map((place) => place.title),
      action: "Track reservations",
    },
    transit: {
      title: "Street-to-street sanity",
      body: "If a day crosses too many clusters, make the first version neighborhood-based and only then add favorites.",
      list: clusters.slice(0, 4).map(([name, items]) => `${name}: walkable loop around ${items.slice(0, 3).map((place) => place.title).join(", ")}`),
      action: "Make loops",
    },
  }[action];

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary">Radar action</p>
          <h3 className="mt-1 text-base font-semibold">{content.title}</h3>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{content.body}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
      </div>
      {content.list.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {content.list.map((item) => (
            <Badge key={item} variant="secondary" className="max-w-full truncate">{item}</Badge>
          ))}
        </div>
      )}
      {(action === "coordinates" || action === "indoor") && (
        <Button className="mt-3" size="sm" onClick={() => window.dispatchEvent(new CustomEvent("nomadnote:open-actions"))}>
          <Plus className="mr-2 h-3.5 w-3.5" />
          {content.action}
        </Button>
      )}
    </div>
  );
}

function BriefMetric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted/55 p-2.5 sm:p-3">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground [&>svg]:h-3.5 [&>svg]:w-3.5">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-lg font-bold tabular-nums sm:text-xl">{value}</div>
    </div>
  );
}

function Signal({
  icon,
  title,
  body,
  tone,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  tone: "good" | "watch";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex gap-3">
        <div
          className={cn(
            "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl [&>svg]:h-4 [&>svg]:w-4",
            tone === "good" ? "bg-secondary/10 text-secondary" : "bg-accent/20 text-accent-foreground"
          )}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p>
        </div>
      </div>
    </div>
  );
}
