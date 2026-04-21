# Publishing NomadNote

This guide covers the official path from local project to public portfolio project, production web deploy, TestFlight, and App Store submission.

## 1. Publish the code to GitHub

This folder is already a Git repository with commits. Create an empty GitHub repository named `nomadnote`, then run:

```bash
cd "/Users/henrique/Documents/New project/nomadnote"
git remote add origin git@github.com:YOUR_USERNAME/nomadnote.git
git push -u origin main
```

If you prefer HTTPS:

```bash
git remote add origin https://github.com/YOUR_USERNAME/nomadnote.git
git push -u origin main
```

After pushing, GitHub Actions will run the CI workflow in `.github/workflows/ci.yml`.

## 2. Add GitHub repository polish

Recommended repository settings:

- Description: `Local-first private travel planner with Trip Stress Radar`
- Website: your Vercel URL after deployment
- Topics: `nextjs`, `typescript`, `travel-planner`, `local-first`, `indexeddb`, `pwa`, `capacitor`, `ios`, `portfolio-project`
- Include releases after major milestones, starting with `v1.0.0-mvp`.

Suggested pinned-project blurb:

> NomadNote is a local-first travel planner that does not just store places. Its Trip Stress Radar detects overload, missing pins, weather risk, FOMO load, and neighborhood spread so travelers can rescue unrealistic itineraries before the trip.

## 3. Deploy the web app

The easiest free option is Vercel.

```bash
npm install
npm run build
npx vercel
```

Use these settings:

- Framework preset: Next.js
- Build command: `npm run build`
- Output directory: leave default
- Environment variables: none required

After deploy, add the Vercel URL to:

- GitHub repository website field
- App Store support URL
- README demo link

## 4. Build the iOS wrapper

NomadNote uses Capacitor so the iOS app is generated from the same static export.

```bash
npm install
npm run ios:add
npm run ios:open
```

In Xcode:

- Select the `App` target.
- Set your Apple Developer Team.
- Confirm bundle identifier: `app.nomadnote.travel`.
- Set app display name: `NomadNote`.
- Set deployment target to a recent iOS version, for example iOS 16+.
- Add production app icons.

For future web changes:

```bash
npm run ios:sync
```

## 5. TestFlight

In Xcode:

1. Select `Any iOS Device`.
2. Product > Archive.
3. Distribute App > App Store Connect > Upload.
4. In App Store Connect, add internal testers.
5. Test first launch, offline relaunch, trip creation, map view, capture flow, itinerary builder, packing checklist, export/import, and Trip Stress Radar.

## 6. App Store submission

Required Apple assets:

- App name: `NomadNote`
- Subtitle: `Private trip planner`
- Category: `Travel`
- Secondary category: `Productivity`
- 1024x1024 app icon
- iPhone screenshots, at least 6.7-inch size
- Support URL
- Privacy policy URL

Recommended description:

```text
NomadNote is a private, local-first travel planner for people who save too many places and need a realistic plan.

Paste map links, social links, articles, coordinates, addresses, or plain notes. NomadNote helps turn them into confirmed places, maps them, groups them into trips, and builds realistic day-by-day itineraries.

The unique Trip Stress Radar catches overloaded days, missing map pins, weak rainy-day backup plans, FOMO-heavy itineraries, and neighborhood backtracking before the trip starts.

No account. No email. No phone number. Your travel data is stored locally on your device by default, with JSON export/import when you want to move or back up a trip.
```

Suggested keywords:

```text
travel planner,itinerary,trip organizer,offline map,packing list,journal,local first,private planner
```

Privacy answers:

- Data collection: no personal data collected by the app owner.
- Tracking: no tracking.
- Account: not required.
- User-generated content: stored locally unless the user exports it.
- Network usage: map tiles and optional geocoding may contact public map providers.

## 7. Release checklist

- `npm run build`
- `npm run build:static`
- `npm test -- --runInBand`
- `npm audit --omit=dev`
- Manual smoke test in browser
- Manual smoke test in iOS simulator
- Screenshot refresh
- README demo URL updated
- Privacy/support URLs live
