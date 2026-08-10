# Dodge PWA

A Progressive Web App for Dodge/Stellantis Uconnect vehicles — charge status, range, tire pressures, location, remote commands (lock/unlock, climate, charge now, etc.).

It runs in **two modes** from a single codebase:

```
Web:     Browser  →  Cloudflare Pages  →  Cloudflare Worker  →  Stellantis API
Android: Native app (Capacitor)  ────────────────────────────→  Stellantis API
```

The Android app needs **no Cloudflare at all**. It talks to Stellantis directly, keeps your
Uconnect credentials in the Android Keystore, and writes driving history into a folder you pick —
put that folder inside Google Drive / Dropbox / OneDrive and your history syncs between devices.

> **Why the Worker still exists for the web build:** of the five Stellantis hosts in the auth chain,
> only `cognito-identity.amazonaws.com` sends CORS headers. The other four send none, so a browser
> tab can never call them directly no matter where it's hosted. The native app bypasses this because
> its HTTP requests originate from Java, not the WebView. See `lib/uconnect-client.js`.

## What you get

- A dashboard of widgets (battery gauge, range, 12V battery, tire pressures, charging status, location, and more) that you can **drag, resize, and show/hide** directly from the app
- Remote commands (lock/unlock, climate on/off, charge now, locate, deep refresh, etc.) as tappable buttons
- A **Settings screen** for unit preferences (miles/km, psi/kPa), vehicle nickname, and layout reset
- Installs to your **Android or iPhone** home screen like a real app (standalone, full screen, its own icon), with an optional native Android package for Play Store distribution

## Architecture

| Piece | What it is | Where it lives |
|---|---|---|
| Frontend | Vanilla JS PWA (Gridstack grid) | `dodge_pwa/frontend/` — served by Cloudflare Pages |
| Backend | Cloudflare Worker | `worker.js` in repo root — deployed to `YOUR_WORKER.YOUR_ACCOUNT.workers.dev` |
| Auth | App password via `X-App-Password` header | Stored in `localStorage` as `dodge_pwa_password` |

### Worker endpoints

```
GET  /                            health check (no auth)
POST /auth                        verify APP_PASSWORD → {ok: true} or 401
GET  /vehicles                    list vehicles
GET  /vehicles/:vin/status        full status (info + doors + location)
GET  /vehicles/:vin/location      last-known location only
POST /vehicles/:vin/command       send command e.g. {command: "RDL"}
POST /vehicles/:vin/charge-preference  set charge level {level: "LEVEL_3"}
```

All endpoints except `/` and `/auth` require the `X-App-Password` header.

### Worker secrets (set in Cloudflare dashboard)

- `UCONNECT_EMAIL` — Stellantis/Uconnect account email
- `UCONNECT_PASSWORD` — Stellantis/Uconnect account password
- `UCONNECT_PIN` — Uconnect PIN
- `APP_PASSWORD` — password for the PWA login screen (you choose this)

### KV binding

- `UCONNECT_CACHE` — KV namespace for caching Stellantis responses

## Prerequisites

1. A **Cloudflare account** (free tier is fine)
2. Your **Stellantis/Uconnect credentials** (same email/password/PIN you use in the official app)
3. This repo forked or cloned — Cloudflare Pages deploys straight from GitHub

## Setup

### 1. Deploy the Worker

1. In the Cloudflare dashboard: **Workers & Pages → Create application → Create Worker**
2. Name it (e.g. `dodge-proxy`), deploy the placeholder, then go to **Edit Code** and paste in `worker.js`
3. Click **Deploy**
4. Under the Worker's **Settings → Variables → KV Namespace Bindings**, add a binding named `UCONNECT_CACHE` pointing to a new (or existing) KV namespace
5. Under **Settings → Variables → Secret Variables**, add the four secrets above

### 2. Deploy the frontend via Cloudflare Pages

1. **Workers & Pages → Create application → Pages → Connect to Git**
2. Select this repo
3. Set **Build output directory** to `dodge_pwa/frontend` and leave the build command blank (static files, no build step)
4. Deploy — Pages will give you a `*.pages.dev` URL

### 3. Point the frontend at your Worker

In `dodge_pwa/frontend/app.js`, update the `WORKER_URL` constant at the top of the file to your Worker's URL (e.g. `https://YOUR_WORKER.YOUR_ACCOUNT.workers.dev`), then push to `main` — Pages redeploys automatically.

### 4. Install on your phone

**Android (Chrome):**

1. Open the Pages URL in Chrome
2. Enter the app password you set as `APP_PASSWORD` in the Worker
3. Tap **⋮ → Install app** (or use the **Install** button under Settings → App)
4. Launch from your home screen icon — full screen, no browser chrome

**iOS (Safari):**

1. Open the Pages URL in **Safari** (iOS requires Safari for PWA install — Chrome/other browsers can't do it)
2. Enter the app password
3. Tap **Share → Add to Home Screen**
4. Launch from your home screen icon

### 5. (Optional) Build a native Android app

Two wrappers are available:

- **Capacitor (`android-app/`) — recommended.** A real native app that skips Cloudflare entirely:
  direct Stellantis calls, Keystore-encrypted credentials, and synced driving history. See below.
- **Trusted Web Activity (`android/`).** Just Chrome in an app shell around your Pages deployment.
  Zero maintenance, but it's still a browser, so it's CORS-bound and always needs the Worker. See
  [`android/README.md`](android/README.md).

## Android app: running without Cloudflare

```bash
npm install
npx cap sync android
npx cap open android      # then Run from Android Studio
```

Then, in the app:

1. On the login screen tap **"Connect directly to your vehicle instead"** (or Settings → Connection
   → Set up).
2. Enter your Uconnect email, password, and PIN. They're verified against Stellantis before being
   saved, then stored with `EncryptedSharedPreferences` (backed by the Android Keystore) — never in
   `localStorage`, and never sent anywhere except Stellantis.
3. Settings → **History Folder → Choose** and pick a folder. Choose one that lives inside Google
   Drive, Dropbox, or OneDrive and that app handles syncing to your other devices.

Once a folder is set, a **History** button appears in the header with distance, trip count,
efficiency, energy added, and per-trip/per-charge detail over 7/30/90 days or all time.

### How the synced folder works

History is written as append-only JSONL, one file per device per month:

```
samples-<deviceId>-2026-08.jsonl
```

Because no two devices ever write the same file, cloud sync clients never generate
"conflicted copy" duplicates. Reads union every device's files and de-duplicate by record id, so
each phone converges on the same complete history.

Stellantis exposes no trip log, so trips and charge sessions are **derived** from odometer and
state-of-charge samples (`lib/history.js`): moves under 0.3 km are treated as GPS/odometer jitter,
and a gap of more than 15 minutes starts a new trip. Efficiency is only reported once you've set
your battery capacity in Settings, since kWh can't be inferred from percentages alone.

## Updating

**Frontend changes** (`index.html`, `app.js`, `styles.css`, `sw.js`): commit and push to `main` — Cloudflare Pages redeploys in about a minute. The service worker uses a network-first strategy, so changes appear on next load without any cache-busting.

**Worker changes** (`worker.js`): paste the updated file into the Cloudflare dashboard → Workers & Pages → your worker → **Edit Code** → **Deploy**. (Cloudflare doesn't currently support pushing Workers directly from GitHub.)

## Sharing with others

Nothing in this repo is tied to any specific person, vehicle, or account — each person sets their own Stellantis credentials as Worker secrets and their own app password. Add collaborators as GitHub collaborators (**Settings → Collaborators**) so they can clone the private repo.

## Project structure

```
worker.js                      Cloudflare Worker (Stellantis API proxy — web build only)
capacitor.config.json          Capacitor config for the native Android app
android-app/                   Native Android app (direct mode, no Cloudflare)
  app/src/main/java/dev/charger/app/
    MainActivity.java          registers the custom plugins
    SecureStorePlugin.java     Keystore-backed credential storage
    SyncedFolderPlugin.java    SAF folder picker + append/read for history files
android/                       Trusted Web Activity wrapper (optional, browser-based)
  twa-manifest.json            Bubblewrap config (run configure.js to fill in your host)
  configure.js                 points the TWA at your Pages deployment
  README.md                    build/signing/asset-link instructions
tests/history.test.mjs         trip/charge derivation tests (npm test)
dodge_pwa/frontend/
  index.html                   app shell, widget templates, Settings/history overlays
  app.js                       all UI logic, API calls, widget renderers
  styles.css
  sw.js                        service worker (network-first, same-origin GETs only)
  manifest.json                PWA manifest
  lib/                         ES modules shared by both modes
    vehicle-api.js             picks direct vs proxy mode at runtime
    uconnect-client.js         Stellantis auth chain + AWS SigV4 (ported from worker.js)
    transport.js               native (CapacitorHttp) vs browser fetch
    credentials.js             Keystore / localStorage credential + session store
    history.js                 synced-folder JSONL store, trip & charge derivation
    recorder.js                turns status snapshots into history samples
    native-bridge.js           exposes window.Charger to the non-module app.js
  .well-known/assetlinks.json  Digital Asset Links for the Android TWA
  icons/                       app icons (180, 192, 512px)
```

## Known gotchas

**Distances and pressures come back metric.** Stellantis returns distances in km and pressures in kPa regardless of locale. The app converts to imperial by default (miles, psi) — you can switch to metric in Settings.

**Commands are fire-and-forget.** Tapping Lock sends the command but doesn't poll back to confirm — same behavior as tapping the entity in the official app.

**Not every command is available on every vehicle.** Horn & lights, remote trunk release, etc. aren't supported on all trim levels. Commands that aren't supported by the Stellantis API are hidden by default.

**Charge speed is read-only.** The Stellantis API doesn't expose charge speed control, so the charge speed tile is display-only.

**The climate switch state may be unreliable.** On some vehicles the switch always reports `unknown`. The ignition sensor tends to reflect actual climate status better.

**Safari only for PWA install on iOS.** Chrome and other iOS browsers can display the app but can't add it to the home screen. On Android there's no such restriction — Chrome installs it directly.

**Map links are platform-aware.** Tapping the location tile opens Apple Maps on iOS, the default map app via a `geo:` link on Android, and Google Maps on the web.

**History only accrues while the app is running.** Samples are captured on each status poll, so leave the app open on a long drive if you want fine-grained trip data. Nothing is lost between sessions — the odometer is absolute — but a drive taken entirely with the app closed shows up as one large jump and is discarded as jitter-free but unattributable, not as a trip.

**Direct mode is Android-only.** The web build always requires the Worker, because Stellantis sends no CORS headers. If you drop Cloudflare entirely, the Android app is your only client.

**Command tiles reorder on long-press.** On touch devices, press and hold a command tile for a moment before dragging — a short swipe scrolls the command bar instead.

## License

Not licensed for public redistribution — shared privately with named collaborators only.
