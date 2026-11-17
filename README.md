# Field Capture

An offline-first React Native app for field workers. Capture a photo or a short voice note with no signal. It is saved on the device straight away and uploads on its own when the connection returns.

- Expo SDK 58 with a development build (not Expo Go)
- React Navigation native stack, TypeScript strict mode
- expo-sqlite for the upload queue, expo-file-system for the captured files
- A local Express mock server that fails some uploads on purpose

See [WRITEUP.md](WRITEUP.md) for the design and the failure modes it handles.

## Requirements

- Node 20 or newer
- **Android:** Android Studio with an emulator (API 34+ recommended) and JDK 17
- **iOS (optional):** Xcode with a simulator, macOS only

## Setup

```bash
npm install                 # app dependencies
npm run server:install      # mock server dependencies (server/package.json)
cp .env.example .env        # sets EXPO_PUBLIC_API_URL
```

## 1. Start the mock server

```bash
npm run server
# Mock upload server on http://0.0.0.0:4000 (FAIL_RATE=0.3, LATENCY_MS=800)
```

| Variable     | Default | Meaning                                       |
| ------------ | ------- | --------------------------------------------- |
| `PORT`       | `4000`  | Port to listen on                             |
| `FAIL_RATE`  | `0.3`   | Share of uploads that return HTTP 500 (0 to 1) |
| `LATENCY_MS` | `800`   | Delay before each upload response             |

Example: `FAIL_RATE=0.6 LATENCY_MS=2000 npm run server`

Each request is logged with its idempotency key and result. Half of the simulated failures happen *after* the file was stored, as if the response was lost. The app's retry then shows up as `duplicate, already stored`, which proves retries never create duplicates. `GET http://localhost:4000/uploads` lists everything the server has received.

## 2. Point the app at the server

The app reads `EXPO_PUBLIC_API_URL` from `.env`:

| Where the app runs | URL                                                                          |
| ------------------ | ---------------------------------------------------------------------------- |
| Android emulator   | `http://10.0.2.2:4000` (the emulator's alias for your computer)              |
| iOS simulator      | `http://localhost:4000`                                                      |
| Physical device    | `http://<your computer's LAN IP>:4000`, e.g. from `ipconfig getifaddr en0` on macOS. The phone must be on the same Wi-Fi network and your firewall must allow port 4000 |

`EXPO_PUBLIC_*` values are baked in when the JavaScript bundle is built. After changing `.env`:
- **Dev build:** restart Metro with `npx expo start --dev-client --clear`.
- **Release build:** rebuild it.

## 3. Build and run on the Android emulator

Start an emulator from Android Studio (Device Manager), then:

```bash
npm run android          # = npx expo run:android
```

This generates the native project, builds the development client, installs it on the emulator and starts Metro. Later runs are faster. Use `npm start` to start only Metro when the app is already installed.

iOS: `npm run ios` (= `npx expo run:ios`).

## 4. Demo: capture offline, kill the app, sync later

A development build loads its JavaScript from Metro over the network. With airplane mode on, a killed and reopened dev build can't load at all. For this demo, install a **release build** instead: it has the JavaScript bundled inside it, just like a real field device.

```bash
npm run server                               # terminal 1
npx expo run:android --variant release       # terminal 2 (rebuild after changing .env)
```

1. Open the app. The list is empty.
2. Turn on **airplane mode** on the emulator: swipe down from the top and tap Airplane mode. The app shows an "Offline" banner.
3. Capture two items:
   - **Photo:** choose "Choose from library", or "Take photo" for the emulator's virtual camera.
   - **Voice note:** tap Record, then Stop and save. If the emulator has no microphone, tap **Use sample recording**.

   Both show **Pending**.
4. Kill the app: open the recent apps view and swipe it away. Then reopen it. Both items are still listed as **Pending**.
5. Turn airplane mode **off**. Within a few seconds the items switch to **Syncing**, then **Synced**. Watch the server terminal for the requests.
6. Some uploads fail (30% by default). Those items show **Error** with the server message and "Retrying automatically (attempt n of 5)". They retry on their own with growing delays. Tap **Retry** on an item, or **Retry all failed**, to retry straight away.

Tip: run the server with `FAIL_RATE=1` to watch an item use up all 5 automatic attempts and then wait for a manual retry. Restart it with `FAIL_RATE=0` and tap **Retry all failed**.

## Scripts

| Command             | What it does                        |
| ------------------- | ----------------------------------- |
| `npm run android`   | Build and run the dev build on Android |
| `npm run ios`       | Build and run the dev build on iOS  |
| `npm start`         | Start Metro for an installed dev build |
| `npm run server`    | Start the mock upload server        |
| `npm test`          | Jest unit tests (queue, backoff, startup recovery) |
| `npm run typecheck` | `tsc --noEmit`                      |
| `npm run lint`      | `expo lint`                         |

## Project structure

```
index.ts                     app entry (registerRootComponent)
src/
  app/                       App.tsx, navigation, services.ts (wires concrete implementations)
  features/
    capture/                 screens, components, hooks for photos and voice notes
    sync/                    SyncEngine (queue), backoff, HTTP uploader, connectivity/foreground triggers
      __tests__/             Jest tests + in-memory repository
  shared/
    storage/                 CaptureRepository interface, SQLite implementation, file helpers
    ui/                      Button, StatusBadge, theme
    config/                  env (EXPO_PUBLIC_API_URL)
    types/                   CaptureItem, SyncStatus
server/                      Express mock upload server
assets/mock/voice-note.m4a   fallback recording for devices without a microphone
```

## Troubleshooting

- **Items stay Pending after airplane mode is off.** The app only uploads when NetInfo reports the internet as reachable. Check that the emulator has internet (open a website in Chrome) and that the server URL is right for where the app runs.
- **Every upload fails with a network error.** The server isn't running, or the URL is wrong. Android emulators can't use `localhost`; use `10.0.2.2`.
- **Jest or Metro crashes with a watchman `libfmt` error.** Your Homebrew watchman install is broken. Run `brew reinstall watchman`, or run tests with `npx jest --no-watchman`.
- **Recording fails on the emulator.** In the emulator's Extended controls → Microphone, enable "Virtual microphone uses host audio input", or use **Use sample recording**.
