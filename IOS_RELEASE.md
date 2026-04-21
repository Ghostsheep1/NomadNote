# NomadNote iOS Release Guide

NomadNote is built as a local-first web app and packaged for iOS with Capacitor. This keeps one TypeScript codebase while still producing an Xcode project that can be signed, archived, tested in TestFlight, and submitted to App Store Connect.

## One-time setup

1. Install Xcode from the Mac App Store.
2. Install Node.js 20+ from https://nodejs.org.
3. Enroll in the Apple Developer Program.
4. In App Store Connect, create an app named `NomadNote` with bundle ID `app.nomadnote.travel`.

## Local build

```bash
npm install
npm run build
npm test
```

## Create the iOS project

```bash
npm run ios:add
npm run ios:open
```

In Xcode:

- Select the `App` target.
- Set the team to your Apple Developer account.
- Confirm bundle identifier: `app.nomadnote.travel`.
- Set display name: `NomadNote`.
- Add the generated app icons from `public/icon-192.png` and `public/icon-512.png` as the source artwork for the iOS icon set.

## TestFlight

```bash
npm run ios:sync
```

Then in Xcode:

1. Choose `Any iOS Device`.
2. Product > Archive.
3. Distribute App > App Store Connect > Upload.
4. Add internal testers in App Store Connect.

## App Store review notes

Use this privacy description:

> NomadNote stores travel plans locally on the user's device by default. It does not require an account, email, phone number, or backend. Map tiles and optional geocoding requests may contact public map providers only when the user uses map/search features.

Suggested App Store subtitle:

> Private local-first trip planner

Suggested keywords:

> travel planner,itinerary,offline,map,packing,journal,trip organizer

## Before public launch

- Replace generated placeholder icon art with a polished 1024x1024 App Store icon.
- Add screenshots from an iPhone 6.7-inch simulator.
- Test first launch, offline relaunch, JSON export/import, trip creation, map pinning, and itinerary generation.
- Add a support URL and privacy policy page. A simple GitHub Pages privacy policy is enough for this local-first MVP.
