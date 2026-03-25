import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../config.js';
import * as schema from './schema/index.js';

const _cache = new Map<string, ReturnType<typeof drizzle>>();

export function createDb(
  url: string = config().DATABASE_URL,
): ReturnType<typeof drizzle<typeof schema>> {
  const cached = _cache.get(url);
  if (cached) return cached as ReturnType<typeof drizzle<typeof schema>>;
  const client = postgres(url, { max: 3 });
  const db = drizzle(client, { schema });
  _cache.set(url, db);
  return db;
}

export type Db = ReturnType<typeof createDb>;
