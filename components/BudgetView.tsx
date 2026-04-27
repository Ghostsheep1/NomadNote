"use client";
/**
 * BudgetView — simple trip budget summary by price level
 */
import React from "react";
import { DollarSign, TrendingUp } from "lucide-react";
import { PRICE_LABELS, CATEGORY_ICONS, formatCurrencyRange } from "@/lib/utils";
import type { Place, PriceLevel } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PRICE_ESTIMATE: Record<PriceLevel, { min: number; max: number }> = {
  free:      { min: 0,   max: 0   },
  budget:    { min: 5,   max: 20  },
  moderate:  { min: 20,  max: 60  },
  expensive: { min: 60,  max: 150 },
  luxury:    { min: 150, max: 400 },
};

interface BudgetViewProps {
  places: Place[];
  currency?: string;
}

export function BudgetView({ places, currency = "USD" }: BudgetViewProps) {
  const byPrice = Object.entries(PRICE_ESTIMATE).map(([level, range]) => {
    const group = places.filter(p => p.priceLevel === level as PriceLevel);
    return { level: level as PriceLevel, places: group, ...range };
  }).filter(g => g.places.length > 0);

  const totalMin = places.reduce((s, p) => s + PRICE_ESTIMATE[p.priceLevel].min, 0);
  const totalMax = places.reduce((s, p) => s + PRICE_ESTIMATE[p.priceLevel].max, 0);
  const freeCount = places.filter(p => p.priceLevel === "free").length;
  const freePercent = places.length ? Math.round((freeCount / places.length) * 100) : 0;

  if (!places.length) return (
    <div className="text-center py-8 text-muted-foreground text-sm">
      <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-30" />
      Add places to see budget breakdown
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Summary card */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Estimated spend</span>
        </div>
        <p className="font-display text-2xl font-bold">
          {formatCurrencyRange(totalMin, totalMax, currency)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Rough estimate based on price levels · {freePercent}% of places are free
        </p>
      </div>

      {/* By price level */}
      {byPrice.map(({ level, places: group, min, max }) => (
        <div key={level}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{PRICE_LABELS[level]}</Badge>
              <span className="text-xs text-muted-foreground">{group.length} place{group.length !== 1 ? "s" : ""}</span>
            </div>
            {level !== "free" && (
              <span className="text-xs text-muted-foreground">
                ~{formatCurrencyRange(min * group.length, max * group.length, currency)}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            {group.map(p => (
              <div key={p.id} className="flex items-center gap-2 text-sm py-1.5 px-3 rounded-lg bg-muted/40">
                <span>{CATEGORY_ICONS[p.category]}</span>
                <span className="flex-1 truncate">{p.title}</span>
                <span className="text-xs text-muted-foreground">{PRICE_LABELS[p.priceLevel]}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <p className="text-xs text-muted-foreground">
        * Estimates are rough per-visit costs in {currency}. Actual spend varies by location and personal choices.
      </p>
    </div>
  );
}
