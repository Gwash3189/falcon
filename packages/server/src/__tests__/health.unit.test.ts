import type { Redis } from 'iovalkey';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { createDb } from '../db/connection.js';
import type { AuditQueue } from '../queue/client.js';
import { DATABASE_URL } from './config.js';

const fakeQueue = { add: async () => {} } as unknown as AuditQueue;

function makeRedis(pingResult: 'ok' | 'fail'): Redis {
  return {
    ping: async () => {
      if (pingResult === 'fail') throw new Error('Redis unreachable');
      return 'PONG';
    },
  } as unknown as Redis;
}

describe('GET /health', () => {
  describe('when the database is unreachable', () => {
    it('returns 503 with status unavailable', async () => {
      const db = createDb('postgresql://bad:bad@localhost:9999/nonexistent');
      const app = createApp({ db, redis: makeRedis('ok'), queue: fakeQueue });
      const res = await app.request('/health');
      expect(res.status).toBe(503);
      const body = (await res.json()) as { status: string };
      expect(body.status).toBe('unavailable');
    });
  });

  describe('when redis is unreachable', () => {
    it('returns 503', async () => {
      const db = createDb(DATABASE_URL);
      const app = createApp({ db, redis: makeRedis('fail'), queue: fakeQueue });
      const res = await app.request('/health');
      expect(res.status).toBe(503);
    });
  });
});
