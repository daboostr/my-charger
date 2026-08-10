# Android app (Trusted Web Activity)

This wraps the same PWA in a native Android package, so it installs from an APK
(or Play Store AAB) and runs full screen with no browser UI. There is **no
separate copy of the app code** — the TWA loads `dodge_pwa/frontend/` from your
Cloudflare Pages URL, so every frontend change ships to the Android app too.

If you don't need a store listing, you don't need any of this: on Android,
Chrome → ⋮ → **Install app** (or the **Install** button in Settings) already
gives a real standalone home-screen app.

## Prerequisites

- Node 18+
- JDK 17
- Android SDK (Bubblewrap will offer to download both if missing)

## 1. Point it at your deployment

```bash
node android/configure.js your-app.pages.dev
```

Optionally pass your own application ID as a second argument
(e.g. `com.yourname.charger`). It must be globally unique on the Play Store.

## 2. Generate and build

```bash
cd android
npx @bubblewrap/cli init --manifest twa-manifest.json
npx @bubblewrap/cli build
```

This produces:

- `app-release-signed.apk` — sideload with `adb install app-release-signed.apk`
- `app-release-bundle.aab` — upload to the Play Console

The first `build` creates `android.keystore`. **Back it up** — losing it means
you can never update a published app. It is gitignored and must never be
committed.

## 3. Verify the app ↔ site link (required)

Without this, Android shows a URL bar at the top of the app.

Print the fingerprint of your signing key:

```bash
cd android
npx @bubblewrap/cli fingerprint list
```

Copy the SHA-256 value into
`dodge_pwa/frontend/.well-known/assetlinks.json`, replacing
`REPLACE_WITH_SHA256_FINGERPRINT_OF_YOUR_SIGNING_KEY`, and set `package_name`
to the same `packageId` used above. Push to `main`; Cloudflare Pages will serve
it at `https://your-app.pages.dev/.well-known/assetlinks.json`.

If you publish through the Play Store, Play re-signs the app — use the SHA-256
from **Play Console → Setup → App integrity** instead (or in addition).

## Updating

- **Frontend changes:** push to `main`. The installed Android app picks them up
  on next launch; no rebuild, no store submission.
- **App shell changes** (name, icon, colors, target SDK): bump `appVersionCode`
  and `appVersionName` in `twa-manifest.json`, then re-run
  `npx @bubblewrap/cli build`.
