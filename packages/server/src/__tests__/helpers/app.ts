/**
 * Creates a test instance of the Hono app wired to the real test database.
 * Redis and the audit queue are stubbed — integration tests focus on HTTP
 * behaviour, not on cache or background-job correctness.
 *
 * Integration tests require a running PostgreSQL database. They are skipped
 * automatically when DATABASE_URL is not set (e.g. in pure-unit CI jobs).
 */
import type { Redis } from 'ioredis';
import { createApp } from '../../app.js';
import { createDb } from '../../db/connection.js';
import type { AuditQueue } from '../../queue/client.js';

export const DATABASE_URL = process.env.DATABASE_URL;

export const INTEGRATION = DATABASE_URL !== undefined;

export const stubRedis = {
  get: async () => null,
  setex: async () => 'OK',
} as unknown as Redis;

export const stubQueue = {
  add: async () => {},
} as unknown as AuditQueue;

export function createTestApp() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL must be set to run integration tests');
  }
  const db = createDb(DATABASE_URL);
  const app = createApp({ db, redis: stubRedis, queue: stubQueue });
  return { app, db };
}

/** Unique slug/key generator to avoid test conflicts. */
export function uid(prefix = 'test'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
