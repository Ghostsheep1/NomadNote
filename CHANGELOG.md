# Changelog

## v1.3.0 - Trust-First Planning Polish

Released: 2026-04-27

### Added

- JSON import preview with schema validation, counts, cancel/confirm, and drag-and-drop.
- Radar confidence and last-updated context.
- Map ready badge plus retryable map error fallback.
- Demo reset action in Settings that leaves personal trips alone.
- Itinerary day energy bars.

### Improved

- Currency formatting now uses trip currency in itinerary export and budget surfaces.
- Trip date fields reset from stored trip data so Info editing stays trustworthy.
- Radar CTAs adapt to healthy metrics instead of always suggesting fixes.
- Mobile dialogs behave more like bottom sheets.
- Trip header and map controls have stronger accessible labels.

### Fixed

- Replaced currency-agnostic dollar glyphs in export-facing itinerary text.
- Renamed “Favorites pressure” to “Anchor pressure.”

### Validation

- `npm run build`
- `npm run build:static`
- `npm test -- --runInBand`
- `npm audit --audit-level=high`

## v1.2.0 - Actionable Planning Engine

Released: 2026-04-27

### Added

- Radar action buttons for map readiness, rain backups, anchor pressure, city spread, reservation risk, and transit complexity.
- Load/reset sample trip flow from the home empty state.
- Demo trips with saved itineraries so new users immediately see insights and realistic radar signals.
- Mobile bottom Radar entry for faster phone navigation.
- Clickable paste examples for first-place empty states.

### Improved

- Trip Stress Radar calibration for tiny trips so one favorite no longer creates fake FOMO panic.
- Packing list UX with clear checkbox-vs-delete affordances and accurate packed progress.
- Global Add flow now asks which trip to use when no trip context is open.
- Command palette now opens the scoped action sheet and includes explicit Light/Dark/System theme choices.
- Capture copy now says “Looking up details...”, “Matched”, or “Couldn’t match automatically” instead of overclaiming.
- Trip card copy now says “Favorites” and “Map-ready”.

### Fixed

- Saved itineraries now show Trip Insights instead of staying stuck on “Build an itinerary first”.
- Removed duplicate “Day 1 Day 1” style itinerary headings.
- Updated Capacitor config for the newer iOS tooling schema.

### Validation

- `npm run build`
- `npm run build:static`
- `npm test -- --runInBand`
- `npm audit --audit-level=high`

## v1.1.0 - Responsive Polish

Released: 2026-04-21

### Added

- Mobile bottom navigation for phone-sized screens.
- In-app version history in Settings.
- Shared `APP_VERSION` source for app and documentation.

### Improved

- Phone and iPad layouts across dashboard, trip pages, Trip Stress Radar, place cards, itinerary builder, and settings.
- Smaller mobile hero typography and stress dial sizing.
- Better touch visibility for card actions on mobile.
- Cleaner responsive spacing and safer bottom padding for mobile navigation.

### Validation

- `npm run build`
- `npm run build:static`
- `npm test -- --runInBand`

## v1.0.0 - MVP Launch

Released: 2026-04-21

### Added

- Local-first trip and place storage.
- Capture inbox for links, notes, map URLs, and coordinates.
- MapLibre/OpenStreetMap map view.
- Heuristic itinerary builder.
- Trip Stress Radar differentiator.
- Packing list, budget view, import/export, command palette, dark mode.
- PWA and iOS packaging path with Capacitor.
