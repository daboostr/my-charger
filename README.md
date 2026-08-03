# Charger PWA

A Progressive Web App for Dodge/Stellantis Uconnect vehicles — charge status, range, tire pressures, location, remote commands (lock/unlock, climate, charge now, etc.) — running entirely on Cloudflare with no server to maintain.

```
Phone (installed PWA)  →  Cloudflare Pages (frontend)  →  Cloudflare Worker  →  Stellantis API
```

## What you get

- A dashboard of widgets (battery gauge, range, 12V battery, tire pressures, charging status, location, and more) that you can **drag, resize, and show/hide** directly from the app
- Remote commands (lock/unlock, climate on/off, charge now, locate, deep refresh, etc.) as tappable buttons
- A **Settings screen** for unit preferences (miles/km, psi/kPa), vehicle nickname, and layout reset
- Installs to your iPhone home screen like a real app (standalone, full screen, its own icon)

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

1. Open the Pages URL in **Safari** (iOS requires Safari for PWA install — Chrome/other browsers can't do it)
2. Enter the app password you set as `APP_PASSWORD` in the Worker
3. Tap **Share → Add to Home Screen**
4. Launch from your home screen icon — full screen, no browser chrome

## Updating

**Frontend changes** (`index.html`, `app.js`, `styles.css`, `sw.js`): commit and push to `main` — Cloudflare Pages redeploys in about a minute. The service worker uses a network-first strategy, so changes appear on next load without any cache-busting.

**Worker changes** (`worker.js`): paste the updated file into the Cloudflare dashboard → Workers & Pages → your worker → **Edit Code** → **Deploy**. (Cloudflare doesn't currently support pushing Workers directly from GitHub.)

## Sharing with others

Nothing in this repo is tied to any specific person, vehicle, or account — each person sets their own Stellantis credentials as Worker secrets and their own app password. Add collaborators as GitHub collaborators (**Settings → Collaborators**) so they can clone the private repo.

## Project structure

```
worker.js                      Cloudflare Worker (Stellantis API proxy + auth)
dodge_pwa/frontend/
  index.html                   app shell, widget templates, Settings overlay
  app.js                       all UI logic, Worker API calls, widget renderers
  styles.css
  sw.js                        service worker (network-first, cache v6)
  manifest.json                PWA manifest
  icons/                       app icons (180, 192, 512px)
```

## Known gotchas

**Distances and pressures come back metric.** Stellantis returns distances in km and pressures in kPa regardless of locale. The app converts to imperial by default (miles, psi) — you can switch to metric in Settings.

**Commands are fire-and-forget.** Tapping Lock sends the command but doesn't poll back to confirm — same behavior as tapping the entity in the official app.

**Not every command is available on every vehicle.** Horn & lights, remote trunk release, etc. aren't supported on all trim levels. Commands that aren't supported by the Stellantis API are hidden by default.

**Charge speed is read-only.** The Stellantis API doesn't expose charge speed control, so the charge speed tile is display-only.

**The climate switch state may be unreliable.** On some vehicles the switch always reports `unknown`. The ignition sensor tends to reflect actual climate status better.

**Safari only for PWA install on iOS.** Chrome and other iOS browsers can display the app but can't add it to the home screen.

## License

Not licensed for public redistribution — shared privately with named collaborators only.
