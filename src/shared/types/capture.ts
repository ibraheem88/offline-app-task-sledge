export type CaptureType = 'photo' | 'voice';

/**
 * pending  – waiting to be uploaded
 * syncing  – upload in progress
 * synced   – server confirmed it
 * error    – last upload failed; `nextRetryAt` set means an automatic retry is scheduled,
 *            null means it needs a manual retry
 */
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error';

export type CaptureItem = {
  /** Client-generated UUID, also sent as the upload idempotency key. */
  id: string;
  type: CaptureType;
  /** File name inside the app's captures directory (see shared/storage/captureFiles). */
  fileName: string;
  mimeType: string;
  createdAt: number;
  status: SyncStatus;
  attempts: number;
  lastError: string | null;
  nextRetryAt: number | null;
};
