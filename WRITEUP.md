# Write-up

## Approach

The one rule: **a capture is written to disk before anything else happens.** Uploading is a separate, retryable step that runs whenever it can.

1. **Capture.** The picker or recorder gives a temporary file. `captureService` copies it into `Documents/captures/<id>.<ext>`, then inserts a queue row in SQLite with status `pending`. If the row can't be written, the copied file is removed and the user sees an error, so nothing is half-saved silently.
2. **Sync.** `SyncEngine` uploads due items one at a time, oldest first, but only while the device is online.
   - Success → `synced`.
   - Failure → `error`, with the server message and a `nextRetryAt` time.
3. **Triggers.** The engine runs:
   - when NetInfo reports the connection is back,
   - when the app returns to the foreground,
   - right after a new capture,
   - from a single timer set for the earliest scheduled retry.
4. **UI.** The list subscribes to the repository and re-reads it after every write, so the badges update live.

### Statuses

| Status    | Meaning |
| --------- | ------- |
| `pending` | Waiting to be uploaded |
| `syncing` | Upload in progress |
| `synced`  | Server confirmed it |
| `error`   | Last attempt failed. If `nextRetryAt` is set, an automatic retry is scheduled. If it is empty, the item waits for a manual retry |

### Architecture

`SyncEngine` only knows two interfaces:
- `CaptureRepository` (storage)
- an `upload(item)` function

It has no React Native imports. In the app those are the SQLite repository and the native multipart uploader. In tests they are an in-memory repository and a Jest mock, so the queue logic is tested in plain Node with fake timers. `src/app/services.ts` is the one place where the real pieces are wired together.

### Retry rules

- **Backoff:** 2 s, 4 s, 8 s… capped at 5 minutes. Half of each delay is random ("jitter"), so many devices reconnecting at once don't retry in lockstep.
- **Attempt limit:** after 5 failed attempts, automatic retries stop. The item stays in `error` until the user taps **Retry** or **Retry all failed**, which starts a fresh set of 5 attempts.
- **What counts as retryable:**
  - Retryable: network errors, timeouts (30 s), HTTP 5xx, 408 and 429.
  - Permanent, no automatic retry: other 4xx, because the request itself is wrong and sending it again won't help.

## Why these libraries

- **expo-sqlite (over MMKV)**
  - The queue is naturally a table of rows that change status.
  - SQLite gives atomic writes, and WAL mode keeps committed data safe if the app is killed mid-write.
  - It is a first-party Expo module, so it adds no extra native dependency.
  - MMKV is faster for small key-value data, but I'd have to serialise the whole list on every status change. Speed doesn't matter at this size.
- **expo-file-system:** the new `File`/`Directory` API copies captures out of the picker cache, which the OS can clear, into the documents directory, which it doesn't. Its native multipart `upload()` sends the file without loading it into JS memory.
- **expo-image-picker:** camera and library in one module; on Android 13+ the system photo picker needs no permission.
- **expo-audio:** the current Expo recording module (replaces `expo-av`). It records AAC `.m4a`.
- **expo-asset:** loads the bundled sample voice note for emulators without a microphone.
- **expo-crypto:** `randomUUID()` creates the capture id on the device. That id is also the upload's `Idempotency-Key`.
- **@react-native-community/netinfo:** connectivity events, and "internet reachable" rather than just "has Wi-Fi".
- **React Navigation (native stack):** routes are defined in code, so folders stay grouped by feature (capture, sync) rather than by screen path.
- **expo-build-properties:** lets release builds talk plain HTTP to the local mock server.
- **No state library:** a repository with `subscribe()` plus one hook is enough for one list.
- **Express + multer** for the mock server: small and well known.

## Failure modes

### Covered

- **App killed mid-upload.** The row is left as `syncing`. On the next launch, before any syncing starts, every `syncing` row goes back to `pending` and is uploaded again with the same id. The server recognises the id and doesn't store it twice. (Tested.)
- **Duplicate uploads.** Every attempt sends the same client-generated id as `Idempotency-Key`. The mock server returns the stored record (HTTP 200) for a key it has already seen. It also simulates "stored, but the response was lost" failures, so this path really runs in the demo.
- **Server errors.** 5xx/408/429 and network errors retry with backoff, up to 5 attempts. Other 4xx stop straight away. The error message is shown on the item.
- **Very long offline periods.** Nothing is attempted while offline, so items don't burn their retry attempts. They stay `pending` for as long as needed and upload in order when the connection returns.
- **File deleted.** Before uploading, the engine checks the local file exists. If it doesn't (for example, app data was cleared), the item becomes `error: Local file is missing` with no automatic retries, instead of failing forever.
- **Storage full.** If copying the file or writing the row fails, the user gets an alert that the capture was *not* saved, and no half-written row is left behind.
- **Clock changes.** Retry times are wall-clock times.
  - Clock moved forward: a retry just happens earlier, which is harmless.
  - Clock moved back: a retry could wait hours. Any retry scheduled further away than the longest backoff is treated as due. (Tested.)

### Not covered (yet)

- **Partial uploads.** Each upload is one request. If the connection drops halfway, the whole file is sent again on retry. That is fine for photos and short voice notes; large files need resumable uploads (see below).
- **Killed between the file copy and the row insert.** This leaves an orphaned file that is safe on disk but not listed. A startup sweep could re-queue or delete such files.
- **Storage growth.** Synced files are kept on the device, and there's no warning before the disk is full (`Paths.availableDiskSpace` could drive one).
- **Uploads only run while the app is open.** Nothing syncs in the background.
- **Mock server dedupe is in memory.** A real server needs a persistent unique constraint on the idempotency key.
- **Clock and ordering.** Items are sorted by device time, so a wrong device clock can upload them out of order. Nothing breaks, but the order is off.

## With more time

- **Background sync** with `expo-background-task`, so queued items upload even if the worker never reopens the app.
- **Chunked / resumable uploads** (for example the tus protocol, or S3 multipart) for large files and patchy connections, so a retry continues where it stopped.
- **Encryption at rest:** SQLCipher through expo-sqlite for the queue, and encrypted capture files with the key in `expo-secure-store`.
- An orphaned-file sweep on startup, and a clean-up policy for synced files.
- Upload progress in the list, using the upload task's `onProgress`.
- End-to-end tests of the airplane-mode flow with Maestro.
