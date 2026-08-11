# Charger for Android

Charger is an Android-only Capacitor app for Dodge/Stellantis Uconnect vehicles. It shows vehicle
status, supports remote commands, records driving samples, and derives trip and charging history.

```
Android app (Capacitor + native plugins) ────> Stellantis API
                         └── synced folder ──> Drive / Dropbox / OneDrive
```

There is no Cloudflare account, Worker, Pages deployment, browser login, or web proxy. Native
Android HTTP is required because most Stellantis auth endpoints do not send CORS headers.

## Build

Requirements:

- Node.js 20+
- Android Studio with Android SDK and a JDK supported by the installed Capacitor version

Install dependencies and generate/sync the Android project:

```bash
npm install
npx cap add android
npm run sync
npm run android:open
```

Build a debug APK:

```bash
npm run android:build
```

The custom plugins are in `android-app/app/src/main/java/dev/charger/app/`:

- `SecureStorePlugin` stores Uconnect credentials with `EncryptedSharedPreferences` backed by the
  Android Keystore.
- `SyncedFolderPlugin` uses the Storage Access Framework, persists folder permission across reboots,
  and reads/appends history files.

If `npx cap add android` creates a generated `android/` project, copy the custom Java plugin files
into the generated app module before syncing. Add these dependencies to
`android/app/build.gradle`:

```groovy
implementation "androidx.documentfile:documentfile:1.0.1"
implementation "androidx.security:security-crypto:1.1.0-alpha06"
```

The generated project is intentionally not committed.

## First launch

1. Tap **Connect to your vehicle**.
2. Enter the Uconnect email, password, and PIN. Credentials are verified with Stellantis before
   they are stored.
3. Open Settings → **History Folder → Choose**.
4. Select a folder inside Google Drive, Dropbox, or OneDrive if history should sync between phones.

The History screen reports distance, trip count, efficiency, energy added, and individual trip and
charge sessions over 7, 30, 90 days, or all time.

## History format

Samples are append-only JSONL files named per device and month:

```
samples-<deviceId>-YYYY-MM.jsonl
```

Each device writes its own file, avoiding sync conflicts. Reads union all device files and
de-duplicate records by id. Trips and charge sessions are derived from odometer and state-of-charge
samples in `dodge_pwa/frontend/lib/history.js`; efficiency requires battery capacity to be configured
in Settings.

## Project structure

```
capacitor.config.json
android-app/                         custom native plugin sources
  app/src/main/java/dev/charger/app/
package.json
tests/history.test.mjs               trip/charge derivation tests
dodge_pwa/frontend/
  index.html                         app shell and native setup/history screens
  app.js                             dashboard and app logic
  styles.css
  lib/
    uconnect-client.js               Stellantis auth chain and API
    transport.js                     CapacitorHttp transport
    vehicle-api.js                   Android vehicle API facade
    credentials.js                   Keystore credential/session storage
    history.js                       SAF JSONL store and derivation
    recorder.js                      status snapshot recorder
    native-bridge.js                 module bridge for app.js
```

## Tests

```bash
npm test
```
