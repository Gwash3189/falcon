import type { Redis } from 'ioredis';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { createDb } from '../db/connection.js';
import type { AuditQueue } from '../queue/client.js';
import { INTEGRATION } from './helpers/app.js';

// Minimal stubs — health check only needs db
const fakeRedis = {} as Redis;
const fakeQueue = { add: async () => {} } as unknown as AuditQueue;

describe('GET /health', () => {
  it.skipIf(!INTEGRATION)('returns 200 when database is reachable', async () => {
    const db = createDb(process.env.DATABASE_URL!);
    const app = createApp({ db, redis: fakeRedis, queue: fakeQueue });
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; timestamp: string };
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
  });

  it('returns 503 when database is unreachable', async () => {
    const db = createDb('postgresql://bad:bad@localhost:9999/nonexistent');
    const app = createApp({ db, redis: fakeRedis, queue: fakeQueue });
    const res = await app.request('/health');
    expect(res.status).toBe(503);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('unavailable');
  });
});
