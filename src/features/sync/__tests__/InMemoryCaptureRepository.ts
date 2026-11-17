import type { CaptureChanges, CaptureRepository } from '@/shared/storage/CaptureRepository';
import type { CaptureItem } from '@/shared/types/capture';

/** Test double with the same behaviour as the SQLite repository. */
export class InMemoryCaptureRepository implements CaptureRepository {
  private readonly items = new Map<string, CaptureItem>();
  private readonly listeners = new Set<() => void>();

  constructor(initial: CaptureItem[] = []) {
    initial.forEach((item) => this.items.set(item.id, { ...item }));
  }

  async list(): Promise<CaptureItem[]> {
    return [...this.items.values()].map((item) => ({ ...item })).sort((a, b) => b.createdAt - a.createdAt);
  }

  async get(id: string): Promise<CaptureItem | null> {
    const item = this.items.get(id);
    return item ? { ...item } : null;
  }

  async insert(item: CaptureItem): Promise<void> {
    this.items.set(item.id, { ...item });
    this.notify();
  }

  async update(id: string, changes: CaptureChanges): Promise<void> {
    const item = this.items.get(id);
    if (!item) return;
    this.items.set(id, { ...item, ...changes });
    this.notify();
  }

  async resetSyncingToPending(): Promise<number> {
    let count = 0;
    this.items.forEach((item) => {
      if (item.status === 'syncing') {
        item.status = 'pending';
        count += 1;
      }
    });
    if (count > 0) this.notify();
    return count;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

export function makeItem(overrides: Partial<CaptureItem> = {}): CaptureItem {
  return {
    id: 'item-1',
    type: 'photo',
    fileName: 'item-1.jpg',
    mimeType: 'image/jpeg',
    createdAt: 1_000,
    status: 'pending',
    attempts: 0,
    lastError: null,
    nextRetryAt: null,
    ...overrides,
  };
}
