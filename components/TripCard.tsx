"use client";
import React from "react";
import Link from "next/link";
import { MapPin, Calendar, Archive, Copy, Trash2, MoreVertical, Download, Route, Heart, CheckCircle2 } from "lucide-react";
import { cn, formatDate, tripDuration } from "@/lib/utils";
import type { Trip } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTripsStore } from "@/store/trips";
import { exportTrip, db } from "@/lib/db";
import { downloadJSON } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";

interface TripCardProps {
  trip: Trip;
  onDelete?: (trip: Trip) => void;
}

export function TripCard({ trip, onDelete }: TripCardProps) {
  const { duplicateTrip, archiveTrip } = useTripsStore();
  const tripPlaces = useLiveQuery(() => db.places.where("tripId").equals(trip.id).toArray(), [trip.id]) ?? [];
  const placeCount = tripPlaces.length;
  const visitedCount = tripPlaces.filter((place) => place.visited).length;
  const favoriteCount = tripPlaces.filter((place) => place.favorite).length;
  const mappedCount = tripPlaces.filter((place) => typeof place.latitude === "number" && typeof place.longitude === "number").length;
  const progress = placeCount ? Math.round((visitedCount / placeCount) * 100) : 0;

  const handleExport = async () => {
    try {
      const bundle = await exportTrip(trip.id);
      downloadJSON(bundle, `nomadnote-${trip.name.toLowerCase().replace(/\s+/g, "-")}.json`);
      toast.success("Trip exported");
    } catch {
      toast.error("Export failed");
    }
  };

  const handleDuplicate = async () => {
    const newTrip = await duplicateTrip(trip.id);
    toast.success(`"${newTrip.name}" created`);
  };

  const duration = tripDuration(trip.startDate, trip.endDate);
  const isDemo = trip.id.startsWith("demo-");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
    >
      <Link href={`/trips?id=${encodeURIComponent(trip.id)}`} className="block group">
        <div className={cn(
          "group/card relative overflow-hidden rounded-[22px] border bg-card transition-all duration-200",
          "hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/25",
          trip.archived && "opacity-60"
        )}>
          <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_12%_10%,hsl(var(--primary)/0.16),transparent_34%),radial-gradient(circle_at_88%_10%,hsl(var(--secondary)/0.16),transparent_32%)]" />
          <div className="h-1.5 bg-gradient-to-r from-primary/70 via-accent/70 to-secondary/70" />

          <div className="relative p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-background/80 text-3xl leading-none shadow-sm backdrop-blur">
                  {trip.emoji ?? "✈️"}
                </span>
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-base leading-tight truncate group-hover:text-primary transition-colors">
                    {trip.name}
                  </h3>
                  {trip.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{trip.description}</p>
                  )}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover/card:opacity-100 transition-opacity"
                    onClick={(e) => e.preventDefault()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleDuplicate(); }}>
                    <Copy className="h-3.5 w-3.5" /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleExport(); }}>
                    <Download className="h-3.5 w-3.5" /> Export JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.preventDefault(); archiveTrip(trip.id, !trip.archived); }}>
                    <Archive className="h-3.5 w-3.5" />
                    {trip.archived ? "Unarchive" : "Archive"}
                  </DropdownMenuItem>
                  {!isDemo && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        destructive
                        onClick={(e) => { e.preventDefault(); onDelete?.(trip); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-4 text-xs text-muted-foreground">
              {trip.startDate && trip.endDate ? (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(trip.startDate, "MMM d")} – {formatDate(trip.endDate, "MMM d, yyyy")}
                  <span className="text-muted-foreground/60">· {duration}d</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-muted-foreground/60">
                  <Calendar className="h-3 w-3" /> No dates set
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {placeCount} place{placeCount !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <MiniStat icon={<CheckCircle2 />} label="Visited" value={`${progress}%`} />
              <MiniStat icon={<Heart />} label="Loved" value={favoriteCount} />
              <MiniStat icon={<MapPin />} label="Pinned" value={`${mappedCount}/${placeCount || 0}`} />
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>

            <div className="flex items-center gap-2 mt-3">
              <Badge variant="secondary" className="text-xs capitalize">{trip.budgetStyle}</Badge>
              {trip.itinerary && trip.itinerary.length > 0 && (
                <Badge variant="success" className="text-xs">
                  <Route className="mr-1 h-3 w-3" />
                  Itinerary ready
                </Badge>
              )}
              {trip.archived && <Badge variant="muted" className="text-xs">Archived</Badge>}
              {isDemo && <Badge variant="warning" className="text-xs">Demo</Badge>}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-background/75 px-3 py-2 shadow-sm ring-1 ring-border/60">
      <div className="flex items-center gap-1.5 text-muted-foreground [&>svg]:h-3 [&>svg]:w-3">
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <div className="mt-1 text-sm font-bold tabular-nums">{value}</div>
    </div>
  );
}
