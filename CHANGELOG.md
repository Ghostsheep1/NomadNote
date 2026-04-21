# Changelog

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
