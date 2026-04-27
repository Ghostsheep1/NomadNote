# GitHub Setup

## Create the repository

1. Go to GitHub.
2. Click New repository.
3. Name it `nomadnote`.
4. Do not initialize with README, license, or gitignore because this project already has them locally.
5. Create repository.

## Push from Terminal

SSH:

```bash
cd "/Users/henrique/Documents/New project/nomadnote"
git remote add origin git@github.com:YOUR_USERNAME/nomadnote.git
git push -u origin main
```

HTTPS:

```bash
cd "/Users/henrique/Documents/New project/nomadnote"
git remote add origin https://github.com/YOUR_USERNAME/nomadnote.git
git push -u origin main
```

## Repository description

```text
Local-first private travel planner with Trip Stress Radar.
```

## Repository topics

```text
nextjs typescript travel-planner local-first indexeddb pwa capacitor ios portfolio-project
```

## About section website

Use the Vercel URL once deployed.

## Suggested current release

Tag:

```text
v1.3.0
```

Release title:

```text
NomadNote v1.3: Trust-first local-first travel planner
```

Release notes:

```md
Version 1.3 release with:

- Local-first trip and place storage
- Capture inbox for links, notes, and map URLs
- MapLibre/OpenStreetMap map view
- Heuristic itinerary builder
- Actionable Trip Stress Radar with repair buttons
- Currency-consistent itinerary export
- Safer JSON import preview and schema validation
- Adaptive radar CTAs and map loading fallback
- Packing list, budget view, import/export, command palette, dark mode
- PWA and iOS packaging path with Capacitor
- Responsive phone and iPad polish
- Sample demo trip reset flow
- Saved itinerary insights
- In-app version history
```
