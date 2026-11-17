import type { CaptureItem } from '@/shared/types/capture';

export type CaptureChanges = Partial<Omit<CaptureItem, 'id'>>;

/** Persistence for capture metadata. The sync engine only talks to this interface. */
export interface CaptureRepository {
  /** All items, newest first. */
  list(): Promise<CaptureItem[]>;
  get(id: string): Promise<CaptureItem | null>;
  insert(item: CaptureItem): Promise<void>;
  update(id: string, changes: CaptureChanges): Promise<void>;
  /** Moves every `syncing` item back to `pending`. Returns how many were reset. */
  resetSyncingToPending(): Promise<number>;
  /** Called after every write. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
}
