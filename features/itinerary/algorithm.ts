/**
 * NomadNote — Itinerary Algorithm
 *
 * Transparent heuristic algorithm that groups places into days
 * by proximity, priority, time-of-day fit, and category diversity.
 *
 * Design goals:
 * - Every placement decision has an explanation
 * - Tunable via scoring weights
 * - Support locked items
 * - Three pacing modes: slow / balanced / packed
 */

import type {
  Place, ItinerarySuggestion, SuggestedDay, SuggestedItem,
  DayExplanation, ItineraryMode, ItineraryItem, ItineraryDay,
} from "@/lib/types";
import { haversineKm, walkingMinutes, centroid } from "@/lib/utils";

// ── Config ──────────────────────────────────────────────────

const MODE_HOURS: Record<ItineraryMode, number> = {
  slow: 6,
  balanced: 8,
  packed: 11,
};

const WEIGHTS = {
  priority: 0.35,
  proximity: 0.30,
  timeOfDayFit: 0.20,
  categoryDiversity: 0.15,
};

// Walking speed: 4.5 km/h → approx 13 min/km
const WALKING_MIN_PER_KM = 13;

// ── Main algorithm ───────────────────────────────────────────

export function buildItinerary(
  places: Place[],
  numDays: number,
  mode: ItineraryMode,
  lockedItems: Map<string, number> = new Map(), // placeId → dayIndex (0-based)
  startDate?: string,
): ItinerarySuggestion {
  const placeable = places.filter((p) => !p.visited && p.latitude && p.longitude);
  const minutesPerDay = MODE_HOURS[mode] * 60;

  if (!placeable.length) {
    return {
      days: [],
      score: 0,
      mode,
      explanations: [],
      warnings: ["No places with coordinates to schedule."],
      stats: { totalPlaces: 0, avgDailyWalkingKm: 0, overloadedDays: 0, backtrackingScore: 0 },
    };
  }

  const warnings: string[] = [];

  // Sort by priority (1=highest) then createdAt
  const sorted = [...placeable].sort((a, b) => a.priority - b.priority);

  // ── Step 1: Proximity clustering ────────────────────────────
  const clusters = clusterByProximity(sorted, 2.0); // 2km radius per cluster

  // ── Step 2: Assign clusters to days ─────────────────────────
  const days: SuggestedDay[] = Array.from({ length: numDays }, (_, i) => ({
    dayNumber: i + 1,
    date: startDate ? offsetDate(startDate, i) : undefined,
    items: [],
    totalDurationMinutes: 0,
    totalTravelMinutes: 0,
  }));

  const assigned = new Set<string>();

  // Locked items first
  for (const [placeId, dayIdx] of lockedItems) {
    const place = sorted.find((p) => p.id === placeId);
    if (!place || dayIdx >= numDays) continue;
    const item = makeSuggestedItem(place, days[dayIdx].items, "Locked to this day");
    days[dayIdx].items.push(item);
    days[dayIdx].totalDurationMinutes += item.travelTimeFromPrevious + place.estimatedDurationMinutes;
    assigned.add(placeId);
  }

  // Distribute clusters across days
  for (const cluster of clusters) {
    const clusterPlaces = cluster.filter((p) => !assigned.has(p.id));
    if (!clusterPlaces.length) continue;

    // Find the best day for this cluster
    const dayIdx = findBestDay(days, clusterPlaces, minutesPerDay);

    for (const place of clusterPlaces) {
      if (days[dayIdx].totalDurationMinutes >= minutesPerDay) break;
      const item = makeSuggestedItem(
        place,
        days[dayIdx].items,
        `Grouped with nearby places in cluster`
      );
      const cost = item.travelTimeFromPrevious + place.estimatedDurationMinutes;
      if (days[dayIdx].totalDurationMinutes + cost <= minutesPerDay * 1.1) {
        days[dayIdx].items.push(item);
        days[dayIdx].totalDurationMinutes += cost;
        assigned.add(place.id);
      }
    }
  }

  // ── Step 3: Reorder each day by time-of-day preference ──────
  for (const day of days) {
    day.items = reorderByTimeOfDay(day.items, sorted);
    assignTimeSlots(day, "09:00");
  }

  // ── Step 4: Build explanations ───────────────────────────────
  const explanations: DayExplanation[] = days.map((day) => {
    const placementReasons: Record<string, string> = {};
    for (const item of day.items) {
      placementReasons[item.placeId] = item.reason;
    }
    const overloaded = day.totalDurationMinutes > minutesPerDay * 1.05;
    return {
      dayNumber: day.dayNumber,
      summary: buildDaySummary(day, sorted),
      placementReasons,
      warnings: overloaded ? ["Day may feel rushed — consider removing one activity"] : [],
    };
  });

  // ── Step 5: Stats ─────────────────────────────────────────────
  const totalWalkingKm = days.reduce((sum, day) => {
    return sum + day.totalTravelMinutes / WALKING_MIN_PER_KM;
  }, 0);

  const overloadedDays = days.filter((d) => d.totalDurationMinutes > minutesPerDay * 1.1).length;
  if (overloadedDays > 0) {
    warnings.push(`${overloadedDays} day(s) may be overloaded for ${mode} pace`);
  }

  const unscheduled = placeable.filter((p) => !assigned.has(p.id));
  if (unscheduled.length > 0) {
    warnings.push(`${unscheduled.length} place(s) couldn't fit in ${numDays} day(s) — add more days or use packed mode`);
  }

  return {
    days: days.filter((d) => d.items.length > 0),
    score: computeOverallScore(days, sorted),
    mode,
    explanations,
    warnings,
    stats: {
      totalPlaces: assigned.size,
      avgDailyWalkingKm: numDays > 0 ? totalWalkingKm / numDays : 0,
      overloadedDays,
      backtrackingScore: computeBacktrackingScore(days, sorted),
    },
  };
}

// ── Convert suggestion to ItineraryDay[] ────────────────────

export function suggestionToItinerary(suggestion: ItinerarySuggestion): ItineraryDay[] {
  return suggestion.days.map((day) => ({
    date: day.date ?? `Day ${day.dayNumber}`,
    dayNumber: day.dayNumber,
    theme: day.theme,
    items: day.items.map((item) => ({
      id: `${item.placeId}-d${day.dayNumber}`,
      placeId: item.placeId,
      startTime: item.startTime,
      endTime: item.endTime,
      duration: item.place.estimatedDurationMinutes,
      locked: false,
      travelTimeFromPrevious: item.travelTimeFromPrevious,
      notes: "",
      order: day.items.indexOf(item),
    })),
  }));
}

// ── Clustering ───────────────────────────────────────────────

function clusterByProximity(places: Place[], radiusKm: number): Place[][] {
  const visited = new Set<string>();
  const clusters: Place[][] = [];

  for (const place of places) {
    if (visited.has(place.id)) continue;
    if (!place.latitude || !place.longitude) continue;

    const cluster: Place[] = [place];
    visited.add(place.id);

    for (const other of places) {
      if (visited.has(other.id)) continue;
      if (!other.latitude || !other.longitude) continue;
      const dist = haversineKm(place.latitude, place.longitude, other.latitude, other.longitude);
      if (dist <= radiusKm) {
        cluster.push(other);
        visited.add(other.id);
      }
    }

    clusters.push(cluster);
  }

  // Sort clusters by their highest-priority item
  return clusters.sort((a, b) => {
    const aPriority = Math.min(...a.map((p) => p.priority));
    const bPriority = Math.min(...b.map((p) => p.priority));
    return aPriority - bPriority;
  });
}

// ── Day selection ────────────────────────────────────────────

function findBestDay(days: SuggestedDay[], cluster: Place[], minutesPerDay: number): number {
  if (!cluster[0]?.latitude || !cluster[0]?.longitude) return 0;

  let bestDay = 0;
  let bestScore = -Infinity;

  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const remaining = minutesPerDay - day.totalDurationMinutes;
    if (remaining < 30) continue;

    let score = remaining; // prefer days with more room

    // Proximity to existing items
    if (day.items.length > 0) {
      const existingPlaceIds = day.items.map((item) => item.placeId);
      const proximityBonus = computeProximityBonus(cluster, existingPlaceIds, day);
      score += proximityBonus;
    } else {
      score += 100; // empty days get a bonus to fill up
    }

    if (score > bestScore) {
      bestScore = score;
      bestDay = i;
    }
  }

  return bestDay;
}

function computeProximityBonus(
  cluster: Place[],
  _existingIds: string[],
  day: SuggestedDay
): number {
  // Can't access place data from items here easily, so use a simple heuristic
  return day.items.length > 0 ? 50 : 0;
}

// ── Item construction ────────────────────────────────────────

function makeSuggestedItem(
  place: Place,
  existing: SuggestedItem[],
  reason: string
): SuggestedItem {
  const prev = existing[existing.length - 1];
  let travelTime = 5; // default walk between nearby places

  if (prev?.place.latitude && prev?.place.longitude && place.latitude && place.longitude) {
    const dist = haversineKm(
      prev.place.latitude, prev.place.longitude,
      place.latitude, place.longitude
    );
    travelTime = Math.round(dist * WALKING_MIN_PER_KM);
  }

  return {
    placeId: place.id,
    place,
    startTime: "09:00",
    endTime: "10:00",
    travelTimeFromPrevious: travelTime,
    reason,
    score: scorePlacement(place, existing),
  };
}

// ── Scoring ──────────────────────────────────────────────────

function scorePlacement(place: Place, dayItems: SuggestedItem[]): number {
  // Priority score (inverted — 1 is best)
  const priorityScore = ((6 - place.priority) / 5) * WEIGHTS.priority;

  // Category diversity bonus
  const existingCategories = new Set(dayItems.map((i) => i.place.category));
  const diversityScore = existingCategories.has(place.category) ? 0 : WEIGHTS.categoryDiversity;

  // Time of day fit (simple)
  const timeScore = WEIGHTS.timeOfDayFit * 0.5; // baseline

  return priorityScore + diversityScore + timeScore;
}

function computeOverallScore(days: SuggestedDay[], _allPlaces: Place[]): number {
  if (!days.length) return 0;
  const avgScore = days.reduce((sum, day) => {
    const dayScore = day.items.reduce((s, item) => s + item.score, 0) / Math.max(1, day.items.length);
    return sum + dayScore;
  }, 0) / days.length;
  return Math.min(100, Math.round(avgScore * 100));
}

function computeBacktrackingScore(days: SuggestedDay[], _places: Place[]): number {
  let totalBacktrack = 0;
  for (const day of days) {
    for (let i = 2; i < day.items.length; i++) {
      // Simple: high travel time relative to duration = backtracking
      if (day.items[i].travelTimeFromPrevious > 30) totalBacktrack++;
    }
  }
  return totalBacktrack;
}

// ── Time-of-day reordering ────────────────────────────────────

const TIME_ORDER = ["morning", "afternoon", "evening", "night", "anytime"];

function reorderByTimeOfDay(items: SuggestedItem[], allPlaces: Place[]): SuggestedItem[] {
  return [...items].sort((a, b) => {
    const pa = allPlaces.find((p) => p.id === a.placeId);
    const pb = allPlaces.find((p) => p.id === b.placeId);
    const aTime = TIME_ORDER.indexOf(pa?.bestTimeOfDay ?? "anytime");
    const bTime = TIME_ORDER.indexOf(pb?.bestTimeOfDay ?? "anytime");
    return aTime - bTime;
  });
}

// ── Time slot assignment ──────────────────────────────────────

function assignTimeSlots(day: SuggestedDay, startTime: string): void {
  let [h, m] = startTime.split(":").map(Number);

  for (const item of day.items) {
    h += Math.floor((m + item.travelTimeFromPrevious) / 60);
    m = (m + item.travelTimeFromPrevious) % 60;

    item.startTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    const duration = item.place.estimatedDurationMinutes;
    h += Math.floor((m + duration) / 60);
    m = (m + duration) % 60;

    item.endTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
}

// ── Day summary ───────────────────────────────────────────────

function buildDaySummary(day: SuggestedDay, allPlaces: Place[]): string {
  if (!day.items.length) return "Empty day";

  const categories = new Set(
    day.items.map((item) => {
      const p = allPlaces.find((x) => x.id === item.placeId);
      return p?.category ?? "other";
    })
  );

  const neighborhoods = new Set(
    day.items
      .map((item) => {
        const p = allPlaces.find((x) => x.id === item.placeId);
        return p?.neighborhood;
      })
      .filter(Boolean)
  );

  const parts: string[] = [];
  if (neighborhoods.size === 1) parts.push(`${[...neighborhoods][0]} area`);
  if (categories.has("museum") || categories.has("attraction")) parts.push("cultural sights");
  if (categories.has("restaurant") || categories.has("cafe")) parts.push("food stops");
  if (categories.has("park") || categories.has("nature")) parts.push("green spaces");

  return parts.length
    ? `${day.items.length} places — ${parts.join(", ")}`
    : `${day.items.length} places across the city`;
}

// ── Helpers ───────────────────────────────────────────────────

function offsetDate(base: string, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ── Smart helpers for the UI ──────────────────────────────────

export interface TripInsight {
  type: "warning" | "tip" | "info";
  icon: string;
  title: string;
  description: string;
}

export function analyzeTrip(places: Place[], numDays: number): TripInsight[] {
  const insights: TripInsight[] = [];
  const withCoords = places.filter((p) => p.latitude && p.longitude);

  // Overload detector
  const avgPerDay = places.length / Math.max(1, numDays);
  if (avgPerDay > 6) {
    insights.push({
      type: "warning",
      icon: "⚡",
      title: "Overloaded itinerary",
      description: `${places.length} places in ${numDays} days — that's ${Math.round(avgPerDay)} per day. Consider a slow or balanced pace.`,
    });
  }

  // Gap finder
  if (numDays > places.length && places.length > 0) {
    insights.push({
      type: "tip",
      icon: "🔍",
      title: "Some days may be light",
      description: `You have ${numDays} days but only ${places.length} places saved. Add more spots or use slow mode.`,
    });
  }

  // Duplicate detector
  const titles = places.map((p) => p.title.toLowerCase().trim());
  const dupes = titles.filter((t, i) => titles.indexOf(t) !== i);
  if (dupes.length) {
    insights.push({
      type: "warning",
      icon: "👯",
      title: "Possible duplicates",
      description: `Found ${dupes.length} possible duplicate place(s). Check your list before building the itinerary.`,
    });
  }

  // No coordinates
  const withoutCoords = places.filter((p) => !p.latitude || !p.longitude);
  if (withoutCoords.length > 0) {
    insights.push({
      type: "info",
      icon: "📍",
      title: `${withoutCoords.length} place(s) missing location`,
      description: "Places without coordinates won't appear on the map or be included in the auto-itinerary.",
    });
  }

  // Best first day
  if (withCoords.length >= 3) {
    const topPriority = withCoords.sort((a, b) => a.priority - b.priority).slice(0, 3);
    const names = topPriority.map((p) => p.title).join(", ");
    insights.push({
      type: "tip",
      icon: "🌟",
      title: "Best first day picks",
      description: `Start strong: ${names}`,
    });
  }

  return insights;
}

export function pickRandomSpot(places: Place[]): Place | null {
  const unvisited = places.filter((p) => !p.visited);
  if (!unvisited.length) return null;
  return unvisited[Math.floor(Math.random() * unvisited.length)];
}

export function findRainyDayAlternatives(places: Place[]): Place[] {
  return places.filter((p) => p.indoorOutdoor === "indoor" && !p.visited);
}

export function travelTimePainScore(days: SuggestedDay[]): number {
  let totalPain = 0;
  for (const day of days) {
    for (const item of day.items) {
      if (item.travelTimeFromPrevious > 20) totalPain += (item.travelTimeFromPrevious - 20) / 10;
    }
  }
  return Math.min(10, Math.round(totalPain));
}
