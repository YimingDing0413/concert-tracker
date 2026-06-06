# Encore mobile app

Encore runs as a **native iOS/Android app** via [Capacitor](https://capacitorjs.com/) (your existing React UI in a native shell) and as a **installable web app** (PWA) on phones.

The native app talks to production: `https://concert-tracker-mauve.vercel.app`

---

## Quick start (Android on Windows)

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Android Studio](https://developer.android.com/studio) (SDK + emulator or USB device)
- Java 17 (Android Studio usually installs this)

### Build and run

```bash
cd concert-tracker
npm install
npm run build
npm run cap:sync
npm run cap:android
```

Android Studio opens → wait for Gradle sync → click **Run** (green play) on an emulator or connected phone.

---

## Scripts

| Command | What it does |
|---------|----------------|
| `npm run build` | Build web assets into `dist/` |
| `npm run cap:sync` | Build + copy `dist/` into native projects |
| `npm run cap:android` | Open Android Studio |
| `npm run cap:ios` | Open Xcode (macOS only) |
| `npm run cap:run:android` | Build, sync, run on device/emulator (CLI) |

---

## iOS (requires a Mac)

```bash
npm run build
npx cap add ios    # first time only
npm run cap:sync
npm run cap:ios
```

In Xcode: select your team for signing → Run on simulator or device.

App Store release: Apple Developer account ($99/year), archive from Xcode, submit via App Store Connect.

---

## Google Play (Android)

1. `npm run cap:sync`
2. Android Studio → **Build → Generate Signed Bundle / APK**
3. Upload **AAB** to [Google Play Console](https://play.google.com/console) ($25 one-time fee)

---

## App icons & splash screen

Place a **1024×1024** PNG at `resources/icon.png` (or use the included `resources/icon.svg` and convert), then:

```bash
npm install @capacitor/assets --save-dev
npx capacitor-assets generate --iconBackgroundColor "#0f1117" --splashBackgroundColor "#0f1117"
npm run cap:sync
```

This updates Android/iOS launcher icons and splash screens.

---

## PWA (no app store)

On iPhone: Safari → Share → **Add to Home Screen**  
On Android: Chrome → menu → **Install app** / **Add to Home screen**

Uses the same site as production after you deploy the latest build.

---

## Local API during native dev (optional)

By default the native app uses production Vercel. To point at a local server:

1. Find your PC LAN IP (e.g. `192.168.1.10`)
2. Run API: `npm run dev:server` (port 3001)
3. Build with:

```bash
set VITE_API_BASE_URL=http://192.168.1.10:3001
npm run build
npm run cap:sync
```

Use `http://10.0.2.2:3001` for Android **emulator** (host machine).

---

## Project layout

```
capacitor.config.ts   # App id, name, webDir
android/              # Android Studio project (after cap add android)
ios/                  # Xcode project (after cap add ios, Mac only)
resources/            # Source icons for asset generation
dist/                 # Web build copied into native apps
```

---

## Troubleshooting

**“Cannot reach the API” on phone**  
- Confirm you built after pulling latest code (`apiBase.ts` routes native traffic to Vercel).  
- On emulator, production URL should still work if the emulator has internet.

**Location / map not working**  
- Allow location permission when prompted.  
- On Android emulator: Extended controls → Location → set coordinates.

**White screen on launch**  
- Run `npm run build` then `npm run cap:sync` again.  
- Check Android Studio **Logcat** for WebView errors.
