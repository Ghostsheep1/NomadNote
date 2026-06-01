# Changelog

## v1.4.0 - Field Atlas Visual Identity

Released: 2026-06-01

### Added

- Custom compass-stamp brand mark for NomadNote.
- Field atlas visual system with inked borders, offset shadows, map-grid texture, and stamp-like labels.
- New font stack: Fraunces for display, Manrope for UI, IBM Plex Mono for operational labels.
- New palette: cobalt blue, tide green, signal chartreuse, coral, ink, and paper.

### Redesigned

- Home hero, metric cards, app shell, sidebar, mobile nav, quick actions, trip cards, Trip Stress Radar, Travel Brief, Settings, buttons, badges, inputs, and dialogs.
- PWA theme color and manifest brand asset.

### Validation

- `npm run build`
- `npm run build:static`
- `npm test -- --runInBand`
- `npm audit --audit-level=high`

## v1.3.3 - Europe Importer Reliability

Released: 2026-04-28

### Added

- Europe 2026 local place guide covering Munich, Budapest, Prague, Vienna, Hallstatt, Salzburg, Ljubljana, Bled, Split, Hvar, Plitvice, Mostar, Kotor, Durmitor, Budva, Dubrovnik, and Athens.
- City-context chaining for batch import, so lines after `Munich` are searched as Munich places until the next city context appears.
- Layered geocoder strategy: known-place lookup, structured city/country search, country search, then raw query fallback.
- Photon autocomplete support with request caching, plus Nominatim structured confirmation fallback.
- Tests for typo aliases, diacritics, city context, ranking, and confidence scoring.

### Improved

- Short queries like `vie`, `bud`, `pra`, `salz`, `bled`, and `hvar` rank the intended Europe itinerary places first.
- Critical aliases now resolve cleanly, including `halstatt`, `Hofbräuhaus`, `Széchenyi Baths`, `Praha-Holešovice`, `Figlmüller`, and `Lake Bled`.
- Confidence scoring now requires country/city context alignment before showing high confidence.
- Add Place review results are grouped by inferred city with ready/review counts.

### Fixed

- Prevented wrong high-confidence matches like Neues Rathaus outside Munich or K+K Hotel Opera outside Budapest.
- Replaced “No match yet” style dead-end copy with review guidance when a line needs more context.

### Validation

- `npm run build`
- `npm run build:static`
- `npm test -- --runInBand`
- `npm audit --audit-level=high`

## v1.3.2 - Add Place UX Polish

Released: 2026-04-27

### Added

- Paste list / Search one mode switch in the Add Place modal.
- Unclipped floating autocomplete dropdown with richer result labels, type badges, and fuzzy match hints.
- Stronger Central Europe ranking for Austria, Hungary, Czechia, Slovenia, Croatia, Bosnia and Herzegovina, Montenegro, Greece, and Germany.
- Fuzzy corrections for common typos like `halstatt`, `viena`, `budapesht`, and `praga`.

### Improved

- Add Place input is now compact, auto-growing, and capped at a comfortable height.
- Placeholder copy is shorter and the inline example hint was removed for a quieter modal.
- Preview CTA now shows the live count of pasted places.
- Screenshot upload is visually secondary so batch preview remains the main path.

### Validation

- `npm run build`
- `npm run build:static`
- `npm test -- --runInBand`
- `npm audit --audit-level=high`

## v1.3.1 - Batch Place Capture and Scroll Fix

Released: 2026-04-27

### Added

- Multi-line Add Place parsing where each pasted line becomes one reviewable candidate.
- Autocomplete suggestions from OpenStreetMap/Nominatim with arrow-key and Enter support.
- Batch preview with matched place, city/country, confidence, “Did you mean?” review, and ambiguous result choices.
- Trip-aware location biasing using existing trip countries and nearby coordinates.
- Duplicate prevention before saving batch places.

### Improved

- Page layout now allows natural vertical scrolling on desktop and mobile.
- Add Place now adds all valid places in one action and leaves unresolved rows for review.
- Place names are normalized to clean casing before save.

### Validation

- `npm run build`
- `npm test -- --runInBand`

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
