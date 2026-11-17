import type { CaptureItem } from '@/shared/types/capture';

import { SyncEngine, type UploadResult } from '../SyncEngine';
import { InMemoryCaptureRepository, makeItem } from './InMemoryCaptureRepository';

const backoff = { baseDelayMs: 1_000, maxDelayMs: 60_000, maxAttempts: 3 };

function setup(items: CaptureItem[], results: UploadResult[] = []) {
  const repository = new InMemoryCaptureRepository(items);
  const uploadedIds: string[] = [];
  const upload = jest.fn(async (item: CaptureItem): Promise<UploadResult> => {
    uploadedIds.push(item.id);
    return results.shift() ?? { ok: true };
  });
  const fileExists = jest.fn((_item: CaptureItem) => true);
  const engine = new SyncEngine({ repository, upload, fileExists, backoff, random: () => 1 });
  return { repository, engine, upload, uploadedIds, fileExists };
}

async function statusOf(repository: InMemoryCaptureRepository, id: string) {
  return (await repository.get(id))?.status;
}

beforeEach(() => {
  jest.useFakeTimers({ now: 100_000 });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('SyncEngine', () => {
  it('does not upload while offline', async () => {
    const { engine, upload } = setup([makeItem()]);

    await engine.sync();

    expect(upload).not.toHaveBeenCalled();
  });

  it('uploads pending items oldest first when the connection returns', async () => {
    const { engine, repository, uploadedIds } = setup([
      makeItem({ id: 'newer', createdAt: 2_000 }),
      makeItem({ id: 'older', createdAt: 1_000 }),
      makeItem({ id: 'done', status: 'synced' }),
    ]);

    engine.setOnline(true);
    await engine.sync();

    expect(uploadedIds).toEqual(['older', 'newer']);
    expect(await statusOf(repository, 'older')).toBe('synced');
    expect(await statusOf(repository, 'newer')).toBe('synced');
  });

  it('marks a failed upload as error and schedules a retry with backoff', async () => {
    const { engine, repository } = setup([makeItem()], [{ ok: false, retryable: true, error: 'HTTP 500' }]);

    engine.setOnline(true);
    await engine.sync();

    expect(await repository.get('item-1')).toMatchObject({
      status: 'error',
      attempts: 1,
      lastError: 'HTTP 500',
      nextRetryAt: 101_000,
    });
  });

  it('retries automatically when the backoff delay has passed', async () => {
    const { engine, repository, upload } = setup([makeItem()], [{ ok: false, retryable: true, error: 'HTTP 500' }]);

    engine.setOnline(true);
    await engine.sync();
    expect(upload).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(999);
    expect(upload).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1);
    await engine.sync();
    expect(upload).toHaveBeenCalledTimes(2);
    expect(await statusOf(repository, 'item-1')).toBe('synced');
  });

  it('sends the same client id on every attempt so the server can deduplicate', async () => {
    const { engine, uploadedIds } = setup([makeItem({ id: 'abc' })], [{ ok: false, retryable: true, error: 'timeout' }]);

    engine.setOnline(true);
    await engine.sync();
    await jest.advanceTimersByTimeAsync(1_000);
    await engine.sync();

    expect(uploadedIds).toEqual(['abc', 'abc']);
  });

  it('stops retrying after the maximum number of attempts', async () => {
    const failure: UploadResult = { ok: false, retryable: true, error: 'HTTP 503' };
    const { engine, repository, upload } = setup([makeItem()], [failure, failure, failure, failure]);

    engine.setOnline(true);
    await engine.sync();
    await jest.advanceTimersByTimeAsync(60_000);
    await engine.sync();

    expect(upload).toHaveBeenCalledTimes(3);
    expect(await repository.get('item-1')).toMatchObject({ status: 'error', attempts: 3, nextRetryAt: null });
  });

  it('retries right away when the clock was moved back past the longest backoff', async () => {
    const { engine, upload } = setup([makeItem({ status: 'error', attempts: 1, nextRetryAt: 100_000 + 61_000 })]);

    engine.setOnline(true);
    await engine.sync();

    expect(upload).toHaveBeenCalledTimes(1);
  });

  it('does not schedule a retry for a permanent failure', async () => {
    const { engine, repository } = setup([makeItem()], [{ ok: false, retryable: false, error: 'HTTP 400' }]);

    engine.setOnline(true);
    await engine.sync();

    expect(await repository.get('item-1')).toMatchObject({ status: 'error', nextRetryAt: null });
  });

  it('treats a thrown error as a retryable failure', async () => {
    const { engine, repository, upload } = setup([makeItem()]);
    upload.mockRejectedValueOnce(new Error('Network request failed'));

    engine.setOnline(true);
    await engine.sync();

    expect(await repository.get('item-1')).toMatchObject({
      status: 'error',
      lastError: 'Network request failed',
      nextRetryAt: 101_000,
    });
  });

  it('marks an item whose local file is missing as error without uploading', async () => {
    const { engine, repository, upload, fileExists } = setup([makeItem()]);
    fileExists.mockReturnValue(false);

    engine.setOnline(true);
    await engine.sync();

    expect(upload).not.toHaveBeenCalled();
    expect(await repository.get('item-1')).toMatchObject({
      status: 'error',
      lastError: 'Local file is missing',
      nextRetryAt: null,
    });
  });

  it('lets the user retry a failed item by hand with a fresh set of attempts', async () => {
    const { engine, repository } = setup([
      makeItem({ status: 'error', attempts: 3, lastError: 'HTTP 500', nextRetryAt: null }),
    ]);
    engine.setOnline(true);
    await engine.sync();
    expect(await statusOf(repository, 'item-1')).toBe('error');

    await engine.retry('item-1');
    await engine.sync();

    expect(await repository.get('item-1')).toMatchObject({ status: 'synced', attempts: 0, lastError: null });
  });

  it('retries every failed item with "retry all failed"', async () => {
    const { engine, repository, uploadedIds } = setup([
      makeItem({ id: 'a', status: 'error', attempts: 3 }),
      makeItem({ id: 'b', status: 'error', attempts: 1, nextRetryAt: 999_999 }),
      makeItem({ id: 'c', status: 'synced' }),
    ]);
    engine.setOnline(true);
    await engine.sync();

    await engine.retryAllFailed();
    await engine.sync();

    expect(uploadedIds.sort()).toEqual(['a', 'b']);
    expect(await statusOf(repository, 'c')).toBe('synced');
  });

  it('picks up items added while a sync is already running', async () => {
    const { engine, repository, uploadedIds } = setup([makeItem({ id: 'first' })]);
    engine.setOnline(true);

    const running = engine.sync();
    await repository.insert(makeItem({ id: 'second', createdAt: 5_000 }));
    await engine.sync();
    await running;

    expect(uploadedIds).toEqual(['first', 'second']);
  });
});

describe('SyncEngine startup recovery', () => {
  it('resets items stuck in syncing back to pending', async () => {
    const { engine, repository } = setup([
      makeItem({ id: 'interrupted', status: 'syncing' }),
      makeItem({ id: 'done', status: 'synced' }),
      makeItem({ id: 'failed', status: 'error', nextRetryAt: null }),
    ]);

    await engine.start();

    expect(await statusOf(repository, 'interrupted')).toBe('pending');
    expect(await statusOf(repository, 'done')).toBe('synced');
    expect(await statusOf(repository, 'failed')).toBe('error');
  });

  it('uploads the recovered item once the device is online', async () => {
    const { engine, repository, uploadedIds } = setup([makeItem({ id: 'interrupted', status: 'syncing' })]);

    await engine.start();
    engine.setOnline(true);
    await engine.sync();

    expect(uploadedIds).toEqual(['interrupted']);
    expect(await statusOf(repository, 'interrupted')).toBe('synced');
  });

  it('never uploads an item still marked syncing before recovery runs', async () => {
    const { engine, upload } = setup([makeItem({ status: 'syncing' })]);

    engine.setOnline(true);
    await engine.sync();

    expect(upload).not.toHaveBeenCalled();
  });
});
