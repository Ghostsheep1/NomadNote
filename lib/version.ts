export const APP_VERSION = "1.1.0";

export const CHANGELOG = [
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
