# Write-up

Field Capture lets a worker with no signal take a photo or record a voice note and be sure it is never lost. Every capture is saved on the phone first and uploads by itself when the connection comes back.

## At a glance

| Requirement | How it's met |
| --- | --- |
| Survives an app kill and restart | File copied into app storage + a SQLite row, before anything else |
| Visible sync state | `pending` / `syncing` / `synced` / `error` badge on every item, plus a status bar for the whole queue |
| Uploads when the connection returns | NetInfo listener, app-foreground listener, and a retry timer all trigger the sync engine |
| Automatic and manual retry | Exponential backoff with jitter, 5 automatic attempts, then **Retry** per item or **Retry all** |
| No duplicates | Client-generated id sent as `Idempotency-Key`; the server dedupes on it |
| Mock server that fails | Express server with `FAIL_RATE` and `LATENCY_MS` |
| Real audio, with a fallback | expo-audio recording; a bundled sample clip if there's no microphone |

## Approach

The one rule: **a capture is written to disk before anything else happens.** Uploading is a separate step that can fail and be retried as often as needed without putting the capture at risk.

1. **Capture.** The camera, picker or recorder gives a temporary file. `captureService` copies it into `Documents/captures/<id>.<ext>`, then inserts a row in SQLite with status `pending`. If the row can't be written, the copied file is deleted and the user is told the capture was not saved. Nothing is half-saved silently.
2. **Sync.** `SyncEngine` uploads due items one at a time, oldest first, and only while the device is online.
   - Success → `synced`.
   - Failure → `error`, with the server's message and the time of the next automatic retry.
3. **Triggers.** The engine runs:
   - when the connection comes back,
   - when the app returns to the foreground,
   - right after a new capture,
   - from a single timer set for the earliest scheduled retry.
4. **Startup recovery.** Before syncing starts, any item still marked `syncing` must have been interrupted by an app kill, so it goes back to `pending`.

### Statuses

| Status | Meaning |
| --- | --- |
| `pending` | Saved, waiting to upload |
| `syncing` | Upload in progress |
| `synced` | Server confirmed it |
| `error` | Last attempt failed. Either an automatic retry is scheduled, or retries are used up and it waits for a manual retry |

### Retry rules

- **Backoff:** about 2 s, 4 s, 8 s…, capped at 5 minutes. Half of each delay is random, so many phones reconnecting at once don't all retry at the same moment.
- **Attempt limit:** after 5 failed attempts, automatic retries stop. **Retry** or **Retry all** gives the item a fresh set of 5.
- **What gets retried:**
  - Retried: network errors, timeouts (30 s), HTTP 5xx, 408 and 429.
  - Not retried automatically: other 4xx responses, because the request itself is wrong and sending it again won't help.

### Architecture

```
src/
  app/        App.tsx, navigation, services.ts (the one place real implementations are wired)
  features/
    capture/  screens, components and hooks for photos, voice notes, playback
    sync/     SyncEngine, backoff, HTTP uploader, connectivity/foreground triggers
  shared/     storage (repository + files), ui kit, config, types
server/       mock upload server
```

`SyncEngine` depends on only two things: the `CaptureRepository` interface and an `upload(item)` function. It imports nothing from React Native.
- In the app, those are the SQLite repository and the native multipart uploader.
- In tests, they are an in-memory repository and a Jest mock, so the queue logic runs in plain Node with fake timers.

Navigation uses React Navigation defined in code, so folders are organised by feature rather than by route.

### UI decisions

The users are on a building site, often outdoors, wearing gloves and with poor signal. That drove these choices:
- **A status bar at the top answers "is my work safe?"**: *Offline · 2 waiting to upload*, *Uploading 1 capture…*, *7 of 8 captures uploaded* or *All 8 captures uploaded*. Failures get their own red row with **Retry all**.
- **Glove-sized controls:** every touch target is at least 48dp. The two capture buttons are 64dp, in a bottom bar within thumb reach.
- **Plain-language errors:** e.g. "Could not reach the upload server", with a hint saying whether the app will retry by itself.
- **Voice notes can be played back** from the list, so a worker can check the recording actually caught their voice.
- **Light theme with high-contrast text**, chosen for readability in daylight.

## Why these libraries

- **expo-sqlite, chosen over MMKV:**
  - The queue is a table of rows whose status changes.
  - SQLite gives atomic writes, and its WAL mode keeps committed data safe if the app is killed mid-write.
  - It is a first-party Expo module.
  - MMKV is faster for small key-value data, but I'd have to re-save the whole list on every status change. Speed doesn't matter at this size; safety does.
- **expo-file-system:** copies captures out of the picker cache, which the OS may clear, into the documents directory, which it doesn't. Its native multipart `upload()` streams the file without loading it into JavaScript memory.
- **expo-image-picker:** camera and photo library in one module.
- **expo-audio:** records AAC `.m4a` and plays it back. It is the current Expo audio module, replacing `expo-av`.
- **expo-asset:** loads the bundled sample voice note for devices without a microphone.
- **expo-crypto:** `randomUUID()` creates each capture's id on the device. The same id is the upload's idempotency key.
- **@react-native-community/netinfo:** connectivity events, including whether the internet is actually reachable rather than just "connected to Wi-Fi".
- **React Navigation (native stack):** native screen transitions, with routes defined in code.
- **@expo/vector-icons:** one consistent icon set. It builds on expo-font, which ships with Expo, so it adds no native code, and the icons work offline.
- **expo-build-properties:** lets release builds send plain HTTP to the local mock server.
- **No state-management library:** the repository notifies on change, and one hook re-reads it. That is enough for a single list.
- **Express + multer** for the mock server: small and widely known.

## Failure modes

### Covered

- **App killed mid-upload.** The item is left as `syncing`. On the next launch it goes back to `pending` and is uploaded again under the same id, and the server's dedupe stops a second copy.
- **Duplicate uploads.** Every attempt sends the same `Idempotency-Key`. For a key it has seen before, the server returns the stored record with HTTP 200. The mock also simulates "stored, but the response was lost" failures, so this path really happens during a demo.
- **Server errors.** Retried with backoff up to 5 times, with the message shown on the item. Client errors (4xx) are not retried automatically.
- **Very long offline periods.** Nothing is attempted while offline, so items don't use up their retries. They wait as `pending` for as long as needed and upload in order when the connection returns.
- **File deleted.** The engine checks the file exists before uploading. If it's gone, the item becomes *"Local file is missing"* and stops retrying, because retrying can't bring it back.
- **Storage full.** If copying the file or writing the row fails, the user is told the capture was not saved, and no half-written entry is left behind.
- **Clock changes.**
  - Retry times use the device clock. If the clock jumps forward, a retry just happens earlier, which is harmless.
  - If it jumps backwards, a retry could otherwise wait for hours. Any retry scheduled further away than the longest backoff is treated as due now.

### Not covered

- **Partial uploads.** Each upload is a single request. If the connection drops halfway, the whole file is sent again. That is fine for photos and short voice notes, but wasteful for large files.
- **App killed between the file copy and the database write.** This leaves a file on disk that the list doesn't show. It's safe, but invisible.
- **Storage growth.** Uploaded files stay on the phone, and nothing warns before the disk fills up.
- **Uploads only run while the app is open.**
- **The mock server keeps its dedupe list in memory.** A real server needs a persistent unique constraint on the idempotency key.
- **Upload order uses the device clock**, so a wrong clock can upload items out of order. Nothing is lost.

## How it was verified

- **Unit tests (Jest, 21 tests)** cover:
  - backoff growth, cap and jitter;
  - uploading oldest first, and nothing while offline;
  - automatic retries and the 5-attempt limit;
  - no automatic retry for permanent errors;
  - missing files;
  - manual **Retry** and **Retry all**;
  - items added mid-sync;
  - the backwards clock change;
  - startup recovery from `syncing` to `pending`.
- **Manual run on an Android emulator (release build)**, which confirmed:
  - airplane mode on, a photo and a voice note captured;
  - app killed and reopened, both still `pending`;
  - airplane mode off, both uploaded;
  - simulated server errors with automatic retries;
  - a retried upload deduplicated by the server;
  - the 5-attempt limit followed by a manual **Retry**;
  - real microphone recording and playback.
- **Static checks:** TypeScript strict (`tsc --noEmit`), ESLint with `no-explicit-any`, and `expo-doctor` all pass.
- **Not exercised on a device:** storage-full handling and an app kill during an upload are handled in code, but weren't reproduced by hand. The upload-interrupted path is covered by the startup-recovery unit tests. Nothing was run on iOS.

## With more time

- **Background sync** with `expo-background-task`, so queued items upload even if the worker never reopens the app.
- **Chunked, resumable uploads** (for example the tus protocol or S3 multipart) for large files on patchy connections, so a retry continues where it stopped.
- **Encryption at rest:** SQLCipher through expo-sqlite for the queue, and encrypted capture files with the key held in `expo-secure-store`.
- **On-device housekeeping:** a startup sweep that re-queues orphaned files, a clean-up policy for uploaded files, and a low-storage warning.
- **Upload progress** shown on each item.
- **End-to-end tests** of the airplane-mode flow with Maestro, plus a check on iOS.
