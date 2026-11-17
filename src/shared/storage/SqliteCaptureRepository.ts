import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import type { CaptureItem } from '@/shared/types/capture';

import type { CaptureChanges, CaptureRepository } from './CaptureRepository';

const COLUMNS: (keyof CaptureItem)[] = [
  'id',
  'type',
  'fileName',
  'mimeType',
  'createdAt',
  'status',
  'attempts',
  'lastError',
  'nextRetryAt',
];

export class SqliteCaptureRepository implements CaptureRepository {
  private readonly db: SQLiteDatabase;
  private readonly listeners = new Set<() => void>();

  constructor(databaseName = 'captures.db') {
    this.db = openDatabaseSync(databaseName);
    // WAL keeps committed writes safe if the app is killed mid-write.
    this.db.execSync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS captures (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        fileName TEXT NOT NULL,
        mimeType TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        status TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        lastError TEXT,
        nextRetryAt INTEGER
      );
    `);
  }

  list(): Promise<CaptureItem[]> {
    return this.db.getAllAsync<CaptureItem>('SELECT * FROM captures ORDER BY createdAt DESC');
  }

  get(id: string): Promise<CaptureItem | null> {
    return this.db.getFirstAsync<CaptureItem>('SELECT * FROM captures WHERE id = ?', id);
  }

  async insert(item: CaptureItem): Promise<void> {
    const placeholders = COLUMNS.map(() => '?').join(', ');
    await this.db.runAsync(
      `INSERT INTO captures (${COLUMNS.join(', ')}) VALUES (${placeholders})`,
      COLUMNS.map((column) => item[column]),
    );
    this.notify();
  }

  async update(id: string, changes: CaptureChanges): Promise<void> {
    const entries = Object.entries(changes).filter(([key]) => COLUMNS.includes(key as keyof CaptureItem));
    if (entries.length === 0) return;

    const assignments = entries.map(([key]) => `${key} = ?`).join(', ');
    const values = entries.map(([, value]) => value as string | number | null);
    await this.db.runAsync(`UPDATE captures SET ${assignments} WHERE id = ?`, [...values, id]);
    this.notify();
  }

  async resetSyncingToPending(): Promise<number> {
    const result = await this.db.runAsync(
      "UPDATE captures SET status = 'pending' WHERE status = 'syncing'",
    );
    if (result.changes > 0) this.notify();
    return result.changes;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}
