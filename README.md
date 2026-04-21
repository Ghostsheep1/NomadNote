# NomadNote

A local-first, privacy-first travel planner. No account. No server. No tracking.

## Why better than Roamy

| Feature | NomadNote | Roamy |
|---|---|---|
| No account needed | ✅ | ❌ |
| 100% free | ✅ | ❌ |
| Local-first storage | ✅ | ❌ |
| Algorithm explanations | ✅ | ❌ |
| Rainy day planner | ✅ | ❌ |
| Overload detector | ✅ | ❌ |
| Travel pain score | ✅ | ❌ |
| Packing list | ✅ | ❌ |
| JSON export/import | ✅ | ❌ |
| Open source maps | ✅ | ❌ |

## Tech stack

- **Framework**: Next.js 14 App Router + TypeScript
- **Styling**: Tailwind CSS + Playfair Display / DM Sans
- **State**: Zustand (UI + domain stores)
- **DB**: Dexie + IndexedDB (local-first)
- **Map**: MapLibre GL + OpenStreetMap (free, no API key)
- **Geocoding**: Nominatim (free, no API key)
- **Forms**: React Hook Form + Zod
- **Drag/drop**: dnd-kit
- **Animations**: Framer Motion
- **Toasts**: Sonner

## Architecture

```
nomadnote/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout + providers
│   ├── page.tsx            # Home — trip list
│   ├── trips/[id]/page.tsx # Trip detail (places, map, itinerary, packing)
│   └── settings/page.tsx   # Settings + privacy
├── components/             # Shared UI components
│   ├── ui/                 # Primitives (button, card, dialog, etc.)
│   ├── AppShell.tsx        # Sidebar + header shell
│   ├── MapView.tsx         # MapLibre GL map
│   ├── PlaceCard.tsx       # Place display card
│   ├── PlaceForm.tsx       # Place edit form
│   ├── TripCard.tsx        # Trip list card
│   ├── TripForm.tsx        # Trip edit form
│   ├── CaptureInbox.tsx    # URL/text extraction flow
│   ├── ItineraryBuilder.tsx # Drag-drop itinerary
│   ├── PackingList.tsx     # Packing checklist
│   ├── CommandPalette.tsx  # ⌘K command palette
│   ├── Onboarding.tsx      # First-run tour
│   └── DBProvider.tsx      # DB init + onboarding gate
├── features/
│   ├── capture/
│   │   └── extractors.ts   # URL/text place extraction + Nominatim
│   └── itinerary/
│       └── algorithm.ts    # Proximity clustering + scoring + explanations
├── store/
│   ├── trips.ts            # Zustand trips store
│   ├── places.ts           # Zustand places store + filters
│   ├── ui.ts               # UI state (persisted)
│   └── capture.ts          # Capture pipeline store
├── lib/
│   ├── types.ts            # All TypeScript types
│   ├── db.ts               # Dexie schema + repositories
│   ├── utils.ts            # Shared utilities
│   └── demo.ts             # Demo data (Tokyo + Lisbon)
└── __tests__/
    ├── extractors.test.ts  # Extraction pipeline tests
    └── algorithm.test.ts   # Itinerary algorithm tests
```

## Itinerary algorithm

The auto-builder uses transparent heuristics:

1. **Filter** — exclude visited places and places without coordinates
2. **Sort** — by priority (1=must-see first), then creation date
3. **Proximity cluster** — group places within 2km radius
4. **Assign to days** — best-fit by remaining time budget + proximity bonus
5. **Time-of-day reorder** — morning → afternoon → evening within each day
6. **Slot assignment** — assign concrete start/end times from 9am
7. **Explanations** — every day and every item gets a reason string

Pacing modes:
- **Slow** — 6 hours/day
- **Balanced** — 8 hours/day  
- **Packed** — 11 hours/day

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

Deploy to Vercel for free:

```bash
npx vercel
```

Or export as static site:

```bash
npm run build
```

## iOS packaging

NomadNote can be shipped to iOS with Capacitor while keeping the same local-first TypeScript codebase:

```bash
npm install
npm run ios:add
npm run ios:open
```

See `IOS_RELEASE.md` for signing, TestFlight, App Store metadata, and review notes.

## Privacy

All data is stored in `IndexedDB` via Dexie. Nothing is sent to any server.
Map tiles are fetched anonymously from OpenFreeMap. Geocoding is done via
Nominatim with a generic User-Agent. No user identifiers are ever transmitted.
