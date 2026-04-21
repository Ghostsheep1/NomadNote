/**
 * Tests for the itinerary algorithm
 */
import { buildItinerary, analyzeTrip, pickRandomSpot, findRainyDayAlternatives } from "@/features/itinerary/algorithm";
import type { Place } from "@/lib/types";

const makePlace = (overrides: Partial<Place>): Place => ({
  id: Math.random().toString(36).slice(2),
  title: "Test Place",
  notes: "",
  tags: [],
  sourceType: "manual",
  city: "Tokyo",
  country: "Japan",
  latitude: 35.68 + (Math.random() - 0.5) * 0.1,
  longitude: 139.69 + (Math.random() - 0.5) * 0.1,
  category: "attraction",
  priority: 3,
  priceLevel: "moderate",
  estimatedDurationMinutes: 90,
  bestTimeOfDay: "anytime",
  indoorOutdoor: "both",
  visited: false,
  favorite: false,
  isFree: false,
  dietaryTags: [],
  images: [],
  collectionIds: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

describe("buildItinerary", () => {
  it("returns empty result with no places", () => {
    const result = buildItinerary([], 3, "balanced");
    expect(result.days).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("distributes places across days", () => {
    const places = Array.from({ length: 9 }, (_, i) => makePlace({ id: `p${i}`, title: `Place ${i}` }));
    const result = buildItinerary(places, 3, "balanced");
    expect(result.days.length).toBeGreaterThan(0);
    const total = result.days.reduce((s, d) => s + d.items.length, 0);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(9);
  });

  it("respects slow mode time budget (fewer places per day)", () => {
    const places = Array.from({ length: 20 }, (_, i) =>
      makePlace({ id: `p${i}`, estimatedDurationMinutes: 60 })
    );
    const resultSlow   = buildItinerary(places, 2, "slow");
    const resultPacked = buildItinerary(places, 2, "packed");
    const slowTotal   = resultSlow.days.reduce((s, d) => s + d.items.length, 0);
    const packedTotal = resultPacked.days.reduce((s, d) => s + d.items.length, 0);
    expect(packedTotal).toBeGreaterThanOrEqual(slowTotal);
  });

  it("generates explanations for each day", () => {
    const places = Array.from({ length: 4 }, (_, i) => makePlace({ id: `p${i}` }));
    const result = buildItinerary(places, 2, "balanced");
    result.explanations.forEach((exp) => {
      expect(exp.summary).toBeTruthy();
    });
  });

  it("assigns time slots in HH:MM format", () => {
    const places = Array.from({ length: 3 }, (_, i) => makePlace({ id: `p${i}` }));
    const result = buildItinerary(places, 1, "balanced");
    if (result.days[0]?.items.length) {
      const firstItem = result.days[0].items[0];
      expect(firstItem.startTime).toMatch(/^\d{2}:\d{2}$/);
      expect(firstItem.endTime).toMatch(/^\d{2}:\d{2}$/);
    }
  });

  it("returns stats object", () => {
    const places = Array.from({ length: 4 }, (_, i) => makePlace({ id: `p${i}` }));
    const result = buildItinerary(places, 2, "balanced");
    expect(result.stats).toBeDefined();
    expect(typeof result.stats.totalPlaces).toBe("number");
    expect(typeof result.stats.avgDailyWalkingKm).toBe("number");
  });

  it("warns when places cannot all fit", () => {
    const places = Array.from({ length: 30 }, (_, i) =>
      makePlace({ id: `p${i}`, estimatedDurationMinutes: 120 })
    );
    const result = buildItinerary(places, 1, "slow"); // 6h = 360min, can't fit 30 × 120min
    expect(result.warnings.some(w => w.includes("couldn't fit"))).toBe(true);
  });
});

describe("analyzeTrip", () => {
  it("detects overloaded itinerary (many places, few days)", () => {
    const places = Array.from({ length: 30 }, (_, i) => makePlace({ id: `p${i}` }));
    const insights = analyzeTrip(places, 3);
    // Should have a warning-type insight
    const warnings = insights.filter(i => i.type === "warning");
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("detects gaps when too few places for many days", () => {
    const places = [makePlace({ id: "p1" }), makePlace({ id: "p2" })];
    const insights = analyzeTrip(places, 7);
    expect(insights.some(i => i.title.toLowerCase().includes("light"))).toBe(true);
  });

  it("detects duplicate place names", () => {
    const places = [
      makePlace({ id: "p1", title: "Senso-ji" }),
      makePlace({ id: "p2", title: "Senso-ji" }),
    ];
    const insights = analyzeTrip(places, 2);
    expect(insights.some(i => i.icon === "👯")).toBe(true);
  });

  it("flags places without coordinates", () => {
    const places = [
      makePlace({ id: "p1", latitude: undefined, longitude: undefined }),
      makePlace({ id: "p2", latitude: undefined, longitude: undefined }),
    ];
    const insights = analyzeTrip(places, 2);
    expect(insights.some(i => i.title.includes("missing location"))).toBe(true);
  });
});

describe("pickRandomSpot", () => {
  it("returns a random unvisited place", () => {
    const places = [
      makePlace({ id: "p1", visited: true }),
      makePlace({ id: "p2", visited: false }),
      makePlace({ id: "p3", visited: false }),
    ];
    const pick = pickRandomSpot(places);
    expect(pick).not.toBeNull();
    expect(pick!.visited).toBe(false);
  });

  it("returns null when all visited", () => {
    const places = [makePlace({ id: "p1", visited: true })];
    expect(pickRandomSpot(places)).toBeNull();
  });

  it("returns null for empty array", () => {
    expect(pickRandomSpot([])).toBeNull();
  });
});

describe("findRainyDayAlternatives", () => {
  it("returns only indoor unvisited places", () => {
    const places = [
      makePlace({ id: "p1", indoorOutdoor: "indoor",  visited: false }),
      makePlace({ id: "p2", indoorOutdoor: "outdoor", visited: false }),
      makePlace({ id: "p3", indoorOutdoor: "indoor",  visited: true  }),
      makePlace({ id: "p4", indoorOutdoor: "both",    visited: false }),
    ];
    const result = findRainyDayAlternatives(places);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("p1");
  });

  it("returns empty when no indoor places", () => {
    const places = [makePlace({ id: "p1", indoorOutdoor: "outdoor" })];
    expect(findRainyDayAlternatives(places)).toHaveLength(0);
  });
});
