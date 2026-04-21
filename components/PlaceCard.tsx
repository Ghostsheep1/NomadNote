"use client";
import React from "react";
import { Heart, MapPin, Clock, Star, Check, MoreHorizontal, Pencil, Trash2, ExternalLink } from "lucide-react";
import { cn, CATEGORY_ICONS, CATEGORY_LABELS, PRICE_LABELS, TIME_ICONS, formatMinutes, truncate } from "@/lib/utils";
import type { Place } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePlacesStore } from "@/store/places";
import { motion } from "framer-motion";

interface PlaceCardProps {
  place: Place;
  onEdit?: (place: Place) => void;
  onDelete?: (place: Place) => void;
  compact?: boolean;
  dragging?: boolean;
  selected?: boolean;
}

export function PlaceCard({ place, onEdit, onDelete, compact, dragging, selected }: PlaceCardProps) {
  const { toggleFavorite, toggleVisited, setSelectedPlace } = usePlacesStore();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group relative flex cursor-pointer gap-3 rounded-xl border bg-card p-3 transition-all duration-150 sm:p-4",
        selected ? "border-primary/50 ring-1 ring-primary/30 shadow-md" : "border-border hover:border-border/80 hover:shadow-sm",
        dragging && "shadow-xl ring-2 ring-primary/20 rotate-1 scale-[1.02]",
        place.visited && "opacity-75"
      )}
      onClick={() => setSelectedPlace(place.id)}
    >
      {/* Category dot */}
      <div
        className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-base"
        style={{ background: `hsl(var(--muted))` }}
      >
        <span>{CATEGORY_ICONS[place.category]}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className={cn("text-sm font-semibold leading-tight truncate", place.visited && "line-through text-muted-foreground")}>
              {place.title}
            </h3>
            {!compact && (place.neighborhood || place.city) && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                <MapPin className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                {[place.neighborhood, place.city].filter(Boolean).join(", ")}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); toggleFavorite(place.id); }}
              className={cn("rounded-md p-1 transition-colors", place.favorite ? "text-red-500" : "text-muted-foreground opacity-100 sm:opacity-0 sm:group-hover:opacity-100")}
            >
              <Heart className={cn("h-3.5 w-3.5", place.favorite && "fill-current")} />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon-sm" variant="ghost" className="h-6 w-6 opacity-100 sm:opacity-0 sm:group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(place); }}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleVisited(place.id); }}>
                  <Check className="h-3.5 w-3.5" /> {place.visited ? "Mark unvisited" : "Mark visited"}
                </DropdownMenuItem>
                {place.sourceUrl && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(place.sourceUrl, "_blank"); }}>
                    <ExternalLink className="h-3.5 w-3.5" /> Open source
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onClick={(e) => { e.stopPropagation(); onDelete?.(place); }}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {!compact && place.notes && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
            {place.notes}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <Badge variant="secondary" className="text-xs gap-1 py-0.5">
            {CATEGORY_LABELS[place.category]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {PRICE_LABELS[place.priceLevel]}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
            <Clock className="h-3 w-3" />
            {formatMinutes(place.estimatedDurationMinutes)}
          </span>
          {place.bestTimeOfDay !== "anytime" && (
            <span className="text-xs text-muted-foreground">
              {TIME_ICONS[place.bestTimeOfDay]}
            </span>
          )}
          {place.priority === 1 && (
            <Badge variant="default" className="text-xs py-0.5">
              <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />
              Must
            </Badge>
          )}
        </div>

        {!compact && place.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {place.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Visited overlay checkmark */}
      {place.visited && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-sage-500 rounded-full flex items-center justify-center">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}
    </motion.div>
  );
}
