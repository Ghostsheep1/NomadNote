export const APP_VERSION = "1.3.3";

export const CHANGELOG = [
  {
    version: "1.3.3",
    title: "Europe importer reliability",
    date: "2026-04-28",
    changes: [
      "Added a Europe 2026 local place guide for major cities, landmarks, stations, hotels, and restaurants.",
      "Added city-context chaining so nearby batch lines resolve inside the active itinerary city.",
      "Improved typo, alias, diacritics, and short-query handling for places like Hallstatt, Vienna, Széchenyi Baths, and Praha-Holešovice.",
      "Hardened confidence scoring so unrelated countries cannot be marked high confidence.",
      "Grouped Add Place review results by inferred city with ready/review counts.",
    ],
  },
  {
    version: "1.3.2",
    title: "Add Place UX polish",
    date: "2026-04-27",
    changes: [
      "Made Add Place lighter with Paste list and Search one modes.",
      "Replaced the oversized text area with compact auto-growing input.",
      "Removed the inline example hint to keep the modal visually quieter.",
      "Added unclipped floating autocomplete results with richer place details.",
      "Improved Central Europe biasing and fuzzy typo correction for common travel inputs.",
    ],
  },
  {
    version: "1.3.1",
    title: "Batch place capture and scroll fix",
    date: "2026-04-27",
    changes: [
      "Fixed page scrolling so long trip pages and mobile layouts move naturally.",
      "Rebuilt Add Place around multi-line batch parsing and review before saving.",
      "Added live place autocomplete with keyboard navigation.",
      "Added typo-tolerant matching, duplicate prevention, and ambiguous result choices.",
      "Added trip-aware location biasing for place search.",
    ],
  },
  {
    version: "1.3.0",
    title: "Trust-first planning polish",
    date: "2026-04-27",
    changes: [
      "Fixed currency consistency in itinerary export and budget surfaces.",
      "Fixed trip date editing so stored dates prefill correctly.",
      "Made radar action buttons adapt to healthy metrics.",
      "Added safer JSON import preview with schema validation.",
      "Improved map loading, retry, and ready states.",
    ],
  },
  {
    version: "1.2.0",
    title: "Actionable planning engine",
    date: "2026-04-27",
    changes: [
      "Turned Trip Stress Radar into a more actionable decision panel.",
      "Added explicit trip selection before adding places from global actions.",
      "Added load/reset demo flow from the home screen.",
      "Improved packing list affordances and progress clarity.",
      "Fixed itinerary insights so saved itineraries show useful feedback.",
    ],
  },
  {
    version: "1.1.0",
    title: "Responsive polish",
    date: "2026-04-21",
    changes: [
      "Improved phone and iPad layouts with mobile bottom navigation.",
      "Reduced hero and Trip Stress Radar density on smaller screens.",
      "Added in-app version history and clearer creator credit.",
      "Prepared GitHub/Vercel release flow for portfolio publishing.",
    ],
  },
  {
    version: "1.0.0",
    title: "MVP launch",
    date: "2026-04-21",
    changes: [
      "Local-first trip, place, map, packing, and itinerary workflows.",
      "Trip Stress Radar differentiator.",
      "PWA, static export, and iOS packaging path.",
    ],
  },
] as const;
