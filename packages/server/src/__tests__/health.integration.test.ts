import type { Redis } from 'iovalkey';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { createDb } from '../db/connection.js';
import type { AuditQueue } from '../queue/client.js';
import { DATABASE_PATH } from './config.js';

const fakeQueue = { add: async () => {} } as unknown as AuditQueue;
const testAppConfig = { BOOTSTRAP_ADMIN_KEY: 'test-bootstrap-key' };

function makeRedis(pingResult: 'ok' | 'fail'): Redis {
  return {
    ping: async () => {
      if (pingResult === 'fail') throw new Error('Redis unreachable');
      return 'PONG';
    },
  } as unknown as Redis;
}

describe('GET /health', () => {
  describe('when db and redis are both healthy', () => {
    it('returns 200 with status ok and a timestamp', async () => {
      const db = createDb(DATABASE_PATH);
      const app = createApp({
        db,
        redis: makeRedis('ok'),
        queue: fakeQueue,
        appConfig: testAppConfig,
      });
      const res = await app.request('/health');
      expect(res.status).toBe(200);
      const body = (await res.json()) as { status: string; timestamp: string };
      expect(body.status).toBe('ok');
      expect(typeof body.timestamp).toBe('string');
    });
  });
});
