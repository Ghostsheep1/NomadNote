# Screenshots and Portfolio Images

Use screenshots to tell the product story quickly. The goal is not just to show screens, but to show why NomadNote is different.

## Required screenshots

Capture these for GitHub, portfolio, Vercel, and App Store:

1. **Home dashboard**  
   Show the hero, local-first positioning, stats, and trip cards.

2. **Trip Stress Radar**  
   This is the unique hook. Open a demo trip and show the stress score, factors, and rescue move.

3. **Map view**  
   Show saved places on the map with markers.

4. **Capture inbox**  
   Show a pasted map/social/text link and extracted candidates.

5. **Itinerary builder**  
   Show day columns, suggestions, and explanation panel.

6. **Packing list and privacy settings**  
   Show local-first utility and trust.

## How to capture web screenshots

Run:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Recommended browser sizes:

- Desktop: 1440x1000
- Mobile web: 390x844
- App Store iPhone: use Xcode simulator for 6.7-inch screenshots

Save final screenshots into:

```text
docs/screenshots/
```

Suggested filenames:

```text
01-home-dashboard.png
02-trip-stress-radar.png
03-map-view.png
04-capture-inbox.png
05-itinerary-builder.png
06-privacy-settings.png
```

## README image block

After screenshots are saved, replace the placeholder image paths in `README.md` with:

```md
![NomadNote home dashboard](docs/screenshots/01-home-dashboard.png)
![Trip Stress Radar](docs/screenshots/02-trip-stress-radar.png)
![Itinerary builder](docs/screenshots/05-itinerary-builder.png)
```

## App Store screenshot copy

Use these captions:

- `Catch unrealistic trips before you go`
- `Save links, notes, maps, and places`
- `Build realistic day-by-day itineraries`
- `Plan privately with no account`
- `Pack, export, and travel offline-friendly`
