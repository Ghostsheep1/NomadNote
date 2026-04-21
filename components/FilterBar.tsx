"use client";
/**
 * FilterBar — horizontal chips for filtering places by category, price, time
 */
import React, { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cn, CATEGORY_ICONS, CATEGORY_LABELS, PRICE_LABELS, TIME_ICONS } from "@/lib/utils";
import type { PlaceCategory, PriceLevel, TimeOfDay } from "@/lib/types";
import { usePlacesStore } from "@/store/places";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";

const CATEGORIES: PlaceCategory[] = [
  "restaurant","cafe","bar","accommodation","attraction","museum",
  "park","beach","market","viewpoint","nightlife","shopping","nature",
];
const PRICES: PriceLevel[] = ["free","budget","moderate","expensive","luxury"];
const TIMES: TimeOfDay[] = ["morning","afternoon","evening","night"];

export function FilterBar() {
  const { filters, setFilters, resetFilters } = usePlacesStore();
  const [expanded, setExpanded] = useState(false);

  const hasActive =
    filters.categories.length > 0 ||
    filters.priceLevel.length > 0 ||
    filters.timeOfDay.length > 0 ||
    filters.favorites ||
    filters.freeOnly;

  const toggleCat = (c: PlaceCategory) => {
    const next = filters.categories.includes(c)
      ? filters.categories.filter(x => x !== c)
      : [...filters.categories, c];
    setFilters({ categories: next });
  };

  const togglePrice = (p: PriceLevel) => {
    const next = filters.priceLevel.includes(p)
      ? filters.priceLevel.filter(x => x !== p)
      : [...filters.priceLevel, p];
    setFilters({ priceLevel: next });
  };

  const toggleTime = (t: TimeOfDay) => {
    const next = filters.timeOfDay.includes(t)
      ? filters.timeOfDay.filter(x => x !== t)
      : [...filters.timeOfDay, t];
    setFilters({ timeOfDay: next });
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Toggle row */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <Button
          size="sm"
          variant={expanded ? "default" : "outline"}
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 gap-1.5"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {hasActive && (
            <span className="bg-primary-foreground/20 text-primary-foreground rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold">
              {filters.categories.length + filters.priceLevel.length + filters.timeOfDay.length + (filters.favorites ? 1 : 0) + (filters.freeOnly ? 1 : 0)}
            </span>
          )}
        </Button>

        {/* Quick category pills */}
        {CATEGORIES.slice(0, 6).map(cat => (
          <button
            key={cat}
            onClick={() => toggleCat(cat)}
            className={cn(
              "flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-all",
              filters.categories.includes(cat)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:border-primary/40"
            )}
          >
            {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
          </button>
        ))}

        {hasActive && (
          <Button size="sm" variant="ghost" onClick={resetFilters} className="flex-shrink-0 text-muted-foreground gap-1">
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 p-3 bg-muted/40 rounded-xl border border-border">
              {/* All categories */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Category</p>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => toggleCat(cat)}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all",
                        filters.categories.includes(cat)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Price</p>
                <div className="flex flex-wrap gap-1.5">
                  {PRICES.map(p => (
                    <button
                      key={p}
                      onClick={() => togglePrice(p)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs border transition-all",
                        filters.priceLevel.includes(p)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {PRICE_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time of day */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Best time</p>
                <div className="flex flex-wrap gap-1.5">
                  {TIMES.map(t => (
                    <button
                      key={t}
                      onClick={() => toggleTime(t)}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-all capitalize",
                        filters.timeOfDay.includes(t)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {TIME_ICONS[t]} {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle flags */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "❤️ Favorites", active: filters.favorites, toggle: () => setFilters({ favorites: !filters.favorites }) },
                  { label: "🆓 Free only", active: filters.freeOnly, toggle: () => setFilters({ freeOnly: !filters.freeOnly }) },
                  { label: "✅ Visited",   active: filters.visited === "visited",   toggle: () => setFilters({ visited: filters.visited === "visited" ? "all" : "visited" }) },
                  { label: "🔲 Unvisited", active: filters.visited === "unvisited", toggle: () => setFilters({ visited: filters.visited === "unvisited" ? "all" : "unvisited" }) },
                ].map(({ label, active, toggle }) => (
                  <button
                    key={label}
                    onClick={toggle}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs border transition-all",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
