import type { CaptureRepository } from '@/shared/storage/CaptureRepository';
import type { CaptureItem } from '@/shared/types/capture';

import { DEFAULT_BACKOFF, nextRetryTime, type BackoffOptions } from './backoff';

export type UploadResult = { ok: true } | { ok: false; retryable: boolean; error: string };

export type SyncEngineDeps = {
  repository: CaptureRepository;
  upload: (item: CaptureItem) => Promise<UploadResult>;
  fileExists: (item: CaptureItem) => boolean;
  backoff?: BackoffOptions;
  now?: () => number;
  random?: () => number;
};

/** An item is due when it was never tried, or its automatic retry time has passed. */
function isDue(item: CaptureItem, now: number): boolean {
  if (item.status === 'pending') return true;
  return item.status === 'error' && item.nextRetryAt !== null && item.nextRetryAt <= now;
}

/**
 * Uploads captures one at a time, oldest first, while the device is online.
 * Has no React Native imports so it can be unit tested in plain Node.
 */
export class SyncEngine {
  private readonly repository: CaptureRepository;
  private readonly upload: SyncEngineDeps['upload'];
  private readonly fileExists: SyncEngineDeps['fileExists'];
  private readonly backoff: BackoffOptions;
  private readonly now: () => number;
  private readonly random: () => number;

  private online = false;
  private running: Promise<void> | null = null;
  private rerunRequested = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(deps: SyncEngineDeps) {
    this.repository = deps.repository;
    this.upload = deps.upload;
    this.fileExists = deps.fileExists;
    this.backoff = deps.backoff ?? DEFAULT_BACKOFF;
    this.now = deps.now ?? Date.now;
    this.random = deps.random ?? Math.random;
  }

  /** Run once at app launch, before syncing. Anything left `syncing` was interrupted by an app kill. */
  async start(): Promise<void> {
    await this.repository.resetSyncingToPending();
  }

  stop(): void {
    this.online = false;
    this.clearRetryTimer();
  }

  setOnline(online: boolean): void {
    this.online = online;
    if (online) {
      void this.sync();
    } else {
      this.clearRetryTimer();
    }
  }

  /** Uploads everything that is due. Calls made while a sync is running trigger one more pass. */
  sync(): Promise<void> {
    if (this.running) {
      this.rerunRequested = true;
      return this.running;
    }
    this.running = this.drain().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  async retry(id: string): Promise<void> {
    const item = await this.repository.get(id);
    if (item?.status !== 'error') return;
    await this.resetForManualRetry(id);
    void this.sync();
  }

  async retryAllFailed(): Promise<void> {
    const failed = (await this.repository.list()).filter((item) => item.status === 'error');
    for (const item of failed) {
      await this.resetForManualRetry(item.id);
    }
    void this.sync();
  }

  private async drain(): Promise<void> {
    do {
      this.rerunRequested = false;
      let item = await this.nextDueItem();
      while (this.online && item) {
        await this.uploadOne(item);
        item = await this.nextDueItem();
      }
    } while (this.rerunRequested && this.online);

    await this.scheduleNextRetry();
  }

  private async nextDueItem(): Promise<CaptureItem | undefined> {
    const now = this.now();
    const due = (await this.repository.list()).filter((item) => isDue(item, now));
    return due.sort((a, b) => a.createdAt - b.createdAt)[0];
  }

  private async uploadOne(item: CaptureItem): Promise<void> {
    if (!this.fileExists(item)) {
      // Retrying can't bring a deleted file back, so don't schedule one.
      await this.repository.update(item.id, {
        status: 'error',
        lastError: 'Local file is missing',
        nextRetryAt: null,
      });
      return;
    }

    await this.repository.update(item.id, { status: 'syncing' });

    let result: UploadResult;
    try {
      result = await this.upload(item);
    } catch (error) {
      result = { ok: false, retryable: true, error: error instanceof Error ? error.message : String(error) };
    }

    if (result.ok) {
      await this.repository.update(item.id, { status: 'synced', lastError: null, nextRetryAt: null });
      return;
    }

    const attempts = item.attempts + 1;
    await this.repository.update(item.id, {
      status: 'error',
      attempts,
      lastError: result.error,
      nextRetryAt: result.retryable ? nextRetryTime(attempts, this.now(), this.backoff, this.random) : null,
    });
  }

  private resetForManualRetry(id: string): Promise<void> {
    return this.repository.update(id, { status: 'pending', attempts: 0, lastError: null, nextRetryAt: null });
  }

  /** One timer for the earliest scheduled retry is enough; each sync reschedules it. */
  private async scheduleNextRetry(): Promise<void> {
    this.clearRetryTimer();
    if (!this.online) return;

    const retryTimes = (await this.repository.list())
      .filter((item) => item.status === 'error' && item.nextRetryAt !== null)
      .map((item) => item.nextRetryAt as number);
    if (retryTimes.length === 0) return;

    const delay = Math.max(0, Math.min(...retryTimes) - this.now());
    this.retryTimer = setTimeout(() => void this.sync(), delay);
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }
}
