# NomadNote

Local-first travel planning for people who save too many places and need a trip that will actually feel good in real life.

Designed and built by **Henrique Ribeiro**.

Current version: **v1.3.2**

NomadNote is a private, no-account travel planner with a unique **Trip Stress Radar**. It does not just store places or generate an itinerary. It warns when the plan is becoming overloaded, under-pinned, weather-fragile, anchor-heavy, or spread across too many neighborhoods.

## Why It Exists

Most travel planners optimize for adding more: more places, more lists, more days, more pins. Real trips fail for the opposite reason. Too many must-sees, too much backtracking, no rainy-day fallback, and no honest signal that the itinerary is turning into work.

NomadNote is built around **Anti-Itinerary Mode**:

> Plan enough to feel confident, not so much that the trip becomes homework.

## Product Differentiator

### Trip Stress Radar

Trip Stress Radar scores a trip from `0` to `100` using:

- **Overload**: too many stops per day
- **Map readiness**: saved places with enough coordinates for routing
- **Rain risk**: not enough indoor or flexible backups
- **Anchor pressure**: too many places competing as anchors
- **City spread**: too many neighborhoods or long-distance clusters
- **Reservation risk**: places likely to need bookings, tickets, or timed entry
- **Transit complexity**: far-apart clusters and backtracking risk

It then gives concrete radar actions, such as:

- Thin busy days
- Add indoor fallbacks near the densest neighborhood
- Fix coordinates before trusting itinerary generation
- Choose one anchor must-see per day
- Build walkable neighborhood loops

This is the core reason someone would use NomadNote over a generic notes app, spreadsheet, Google Maps list, or itinerary generator.

## Screenshots

Screenshots should be added to `docs/screenshots/` before publishing the GitHub repo publicly.

Recommended hero images:

- `01-home-dashboard.png`
- `02-trip-stress-radar.png`
- `03-map-view.png`
- `04-capture-inbox.png`
- `05-itinerary-builder.png`
- `06-privacy-settings.png`

See [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md) for capture instructions and App Store screenshot captions.

## Feature List

- Local-first storage with Dexie and IndexedDB
- No account, login, email, phone number, or mandatory backend
- Capture inbox for URLs, coordinates, screenshots, addresses, and free text
- Batch Add Place flow with one-place-per-line parsing, autocomplete, review, and typo-tolerant matching
- Pragmatic parser for Google Maps, Apple Maps, OpenStreetMap, social links, and text notes
- Candidate confidence labels, with user confirmation before saving
- Trip creation, archive, duplicate, JSON import/export
- Place attributes: priority, tags, category, price, best time, indoor/outdoor, dietary tags, travel flags, coordinates, notes, and source links
- MapLibre map with OpenStreetMap tiles
- Smart itinerary builder with proximity clustering and transparent explanations
- Actionable Trip Stress Radar with metric repair buttons
- Rainy-day alternatives
- Random spot picker
- Neighborhood grouping
- Budget view
- Packing checklist
- Command palette
- Dark mode
- PWA install support
- iOS packaging path with Capacitor
- CI build/test workflow for GitHub Actions

## Tech Stack

- **Framework**: Next.js 16 App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI**: shadcn-style Radix primitives
- **State**: Zustand
- **Storage**: Dexie and IndexedDB
- **Maps**: MapLibre GL with OpenStreetMap-compatible tiles
- **Forms**: React Hook Form and Zod
- **Drag and drop**: dnd-kit
- **Animation**: Framer Motion
- **Testing**: Jest and ts-jest
- **iOS wrapper**: Capacitor

## Architecture

```text
nomadnote/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── trips/page.tsx
│   └── settings/page.tsx
├── components/
│   ├── ui/
│   ├── AppShell.tsx
│   ├── CaptureInbox.tsx
│   ├── HomeDashboard.tsx
│   ├── ItineraryBuilder.tsx
│   ├── MapView.tsx
│   ├── TripBrief.tsx
│   └── TripStressRadar.tsx
├── features/
│   ├── capture/extractors.ts
│   └── itinerary/algorithm.ts
├── store/
│   ├── capture.ts
│   ├── places.ts
│   ├── trips.ts
│   └── ui.ts
├── lib/
│   ├── db.ts
│   ├── demo.ts
│   ├── types.ts
│   └── utils.ts
├── docs/
│   ├── APP_STORE_METADATA.md
│   ├── GITHUB_SETUP.md
│   ├── PUBLISHING.md
│   └── SCREENSHOTS.md
└── __tests__/
    ├── algorithm.test.ts
    └── extractors.test.ts
```

## Local Development

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Validation

```bash
npm run build
npm run build:static
npm test -- --runInBand
npm audit --omit=dev
```

## Web Deployment

Recommended: Vercel.

```bash
npm install
npm run build
npx vercel
```

No environment variables are required for the MVP.

## iOS and App Store

NomadNote can be packaged for iOS with Capacitor:

```bash
npm install
npm run ios:add
npm run ios:open
```

Full instructions:

- [docs/PUBLISHING.md](docs/PUBLISHING.md)
- [docs/APP_STORE_METADATA.md](docs/APP_STORE_METADATA.md)
- [IOS_RELEASE.md](IOS_RELEASE.md)

## GitHub Setup

See [docs/GITHUB_SETUP.md](docs/GITHUB_SETUP.md).

Quick version:

```bash
git remote add origin git@github.com:YOUR_USERNAME/nomadnote.git
git push -u origin main
```

## Privacy

NomadNote stores trip data locally by default. It does not require an account and does not include analytics tracking or ad tracking by default.

Included legal/support pages:

- `public/legal/privacy.html`
- `public/legal/support.html`

## Status

Portfolio-ready MVP, currently at v1.3.2. The next strongest improvements would be production screenshots, a custom 1024x1024 app icon, and TestFlight validation on a physical iPhone.

See [CHANGELOG.md](CHANGELOG.md) for release history.
