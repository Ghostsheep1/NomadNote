"use client";
import React from "react";
import Link from "next/link";
import { MapPin, Calendar, Archive, Copy, Trash2, MoreVertical, Download, Unlock } from "lucide-react";
import { cn, formatDate, tripDuration, PRICE_LABELS } from "@/lib/utils";
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
  const placeCount = useLiveQuery(() => db.places.where("tripId").equals(trip.id).count(), [trip.id]) ?? 0;

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
      <Link href={`/trips/${trip.id}`} className="block group">
        <div className={cn(
          "relative rounded-2xl border bg-card overflow-hidden transition-all duration-200",
          "hover:shadow-md hover:border-primary/20",
          trip.archived && "opacity-60"
        )}>
          {/* Color band at top based on emoji */}
          <div className="h-1.5 bg-gradient-to-r from-primary/60 via-accent/60 to-secondary/60" />

          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-3xl leading-none flex-shrink-0">{trip.emoji ?? "✈️"}</span>
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
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
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

            <div className="flex items-center gap-2 mt-3">
              <Badge variant="secondary" className="text-xs capitalize">{trip.budgetStyle}</Badge>
              {trip.itinerary && trip.itinerary.length > 0 && (
                <Badge variant="success" className="text-xs">Itinerary ready</Badge>
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
