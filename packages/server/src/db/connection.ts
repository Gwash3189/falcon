import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { config } from '../config.js';
import * as schema from './schema/index.js';

const _cache = new Map<string, ReturnType<typeof drizzle>>();

export function createDb(
  path: string = config().DATABASE_PATH,
): ReturnType<typeof drizzle<typeof schema>> {
  const cached = _cache.get(path);
  if (cached) return cached as ReturnType<typeof drizzle<typeof schema>>;
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }
  const sqlite = new Database(path);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  _cache.set(path, db);
  return db;
}

export type Db = ReturnType<typeof createDb>;
