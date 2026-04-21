"use client";
/**
 * PlaceDetailSheet — slide-up sheet on mobile showing full place details.
 * Used in map view when a marker is tapped.
 */
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, MapPin, Clock, ExternalLink, Heart, Check,
  Star, Navigation, Share2, Edit2,
} from "lucide-react";
import { cn, CATEGORY_ICONS, CATEGORY_LABELS, PRICE_LABELS, TIME_ICONS, formatMinutes } from "@/lib/utils";
import type { Place } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePlacesStore } from "@/store/places";

interface PlaceDetailSheetProps {
  place: Place | null;
  onClose: () => void;
  onEdit?: (place: Place) => void;
}

export function PlaceDetailSheet({ place, onClose, onEdit }: PlaceDetailSheetProps) {
  const { toggleFavorite, toggleVisited } = usePlacesStore();

  return (
    <AnimatePresence>
      {place && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-2xl md:hidden"
            style={{ maxHeight: "75dvh" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="overflow-y-auto px-5 pb-8">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl">{CATEGORY_ICONS[place.category]}</span>
                  <div className="min-w-0">
                    <h2 className="font-display font-semibold text-lg leading-tight">
                      {place.title}
                    </h2>
                    {(place.neighborhood || place.city) && (
                      <p className="text-sm text-muted-foreground truncate">
                        <MapPin className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                        {[place.neighborhood, place.city].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
                <Button size="icon-sm" variant="ghost" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Meta badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="secondary">{CATEGORY_LABELS[place.category]}</Badge>
                <Badge variant="outline">{PRICE_LABELS[place.priceLevel]}</Badge>
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {formatMinutes(place.estimatedDurationMinutes)}
                </Badge>
                {place.bestTimeOfDay !== "anytime" && (
                  <Badge variant="outline">
                    {TIME_ICONS[place.bestTimeOfDay]} {place.bestTimeOfDay}
                  </Badge>
                )}
                {place.priority === 1 && (
                  <Badge variant="default">
                    <Star className="h-3 w-3 mr-1 fill-current" /> Must see
                  </Badge>
                )}
                {place.visited && (
                  <Badge variant="success">
                    <Check className="h-3 w-3 mr-1" /> Visited
                  </Badge>
                )}
              </div>

              {/* Notes */}
              {place.notes && (
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {place.notes}
                </p>
              )}

              {/* Tags */}
              {place.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {place.tags.map(tag => (
                    <span key={tag} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Flags */}
              <div className="flex flex-wrap gap-2 mb-5">
                {place.isChildFriendly && <span className="text-xs text-muted-foreground">👶 Child-friendly</span>}
                {place.isSoloFriendly && <span className="text-xs text-muted-foreground">🎒 Solo-friendly</span>}
                {place.isDateNight && <span className="text-xs text-muted-foreground">💑 Date night</span>}
                {place.isFree && <span className="text-xs text-muted-foreground">🆓 Free</span>}
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={place.favorite ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleFavorite(place.id)}
                  className="gap-2"
                >
                  <Heart className={cn("h-4 w-4", place.favorite && "fill-current")} />
                  {place.favorite ? "Saved" : "Save"}
                </Button>
                <Button
                  variant={place.visited ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => toggleVisited(place.id)}
                  className="gap-2"
                >
                  <Check className="h-4 w-4" />
                  {place.visited ? "Visited ✓" : "Mark visited"}
                </Button>
                {place.sourceUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(place.sourceUrl, "_blank")}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" /> Source
                  </Button>
                )}
                {onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(place)}
                    className="gap-2"
                  >
                    <Edit2 className="h-4 w-4" /> Edit
                  </Button>
                )}
              </div>

              {/* Coordinates */}
              {place.latitude && place.longitude && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 mt-4 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <Navigation className="h-3 w-3" />
                  {place.latitude.toFixed(5)}, {place.longitude.toFixed(5)} — Open in Google Maps
                </a>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
