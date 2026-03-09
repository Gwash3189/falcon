import type { Redis } from 'iovalkey';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { createDb } from '../db/connection.js';
import type { AuditQueue } from '../queue/client.js';
import { DATABASE_URL } from './config.js';
import { uid } from './helpers/app.js';

const stubQueue = { add: async () => {} } as unknown as AuditQueue;

function createMockRedis() {
  const store = new Map<string, string>();
  return {
    _store: store,
    get: async (key: string) => store.get(key) ?? null,
    setex: async (key: string, _ttl: number, value: string) => {
      store.set(key, value);
      return 'OK';
    },
    incr: async (key: string) => {
      const current = parseInt(store.get(key) || '0', 10);
      const next = current + 1;
      store.set(key, String(next));
      return next;
    },
    pexpire: async (_key: string, _ms: number) => true,
  } as unknown as Redis & { _store: Map<string, string> };
}

function buildApp(redis: Redis) {
  const db = createDb(DATABASE_URL);
  return createApp({ db, redis, queue: stubQueue });
}

describe('Evaluate API', () => {
  let projectId: string;
  let envId: string;
  let rawKey: string;

  beforeAll(async () => {
    const baseApp = buildApp(createMockRedis());

    const projRes = await baseApp.request('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: uid('Project'), slug: uid('proj') }),
    });
    const projBody = (await projRes.json()) as { data: { id: string } };
    projectId = projBody.data.id;

    const envRes = await baseApp.request(`/api/projects/${projectId}/environments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: uid('Env'), slug: uid('env') }),
    });
    const envBody = (await envRes.json()) as { data: { id: string } };
    envId = envBody.data.id;

    const keyRes = await baseApp.request(
      `/api/projects/${projectId}/environments/${envId}/api-keys`,
      { method: 'POST' },
    );
    const keyBody = (await keyRes.json()) as { data: { rawKey: string } };
    rawKey = keyBody.data.rawKey;

    await baseApp.request(`/api/projects/${projectId}/environments/${envId}/flags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'my-feature',
        type: 'boolean',
        enabled: true,
      }),
    });
  });

  afterAll(async () => {
    const baseApp = buildApp(createMockRedis());
    await baseApp.request(`/api/projects/${projectId}`, { method: 'DELETE' });
  });

  function evaluate(app: ReturnType<typeof buildApp>, body: object) {
    return app.request('/evaluate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rawKey}`,
      },
      body: JSON.stringify(body),
    });
  }

  describe('when no Authorization header is present', () => {
    it('returns 401', async () => {
      const app = buildApp(createMockRedis());
      const res = await app.request('/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag_key: 'my-feature' }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe('when the API key is invalid', () => {
    it('returns 401', async () => {
      const app = buildApp(createMockRedis());
      const res = await app.request('/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer flk_invalid',
        },
        body: JSON.stringify({ flag_key: 'my-feature' }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe('when the request is valid', () => {
    it('evaluates a flag and returns the result', async () => {
      const app = buildApp(createMockRedis());
      const res = await evaluate(app, { flag_key: 'my-feature' });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { flag_key: string; enabled: boolean };
      };
      expect(body.data.flag_key).toBe('my-feature');
      expect(typeof body.data.enabled).toBe('boolean');
    });

    it('accepts an optional identifier in the body', async () => {
      const app = buildApp(createMockRedis());
      const res = await evaluate(app, {
        flag_key: 'my-feature',
        identifier: 'user-123',
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { enabled: boolean } };
      expect(typeof body.data.enabled).toBe('boolean');
    });

    it('serves the result from cache on a second request', async () => {
      const mockRedis = createMockRedis();
      const app = buildApp(mockRedis);

      await evaluate(app, { flag_key: 'my-feature' });
      // Count only cache entries (keys starting with 'flag:')
      const cacheEntries = Array.from(mockRedis._store.keys()).filter((k) =>
        k.startsWith('flag:'),
      ).length;
      expect(cacheEntries).toBe(1);

      const res = await evaluate(app, { flag_key: 'my-feature' });
      expect(res.status).toBe(200);
    });
  });

  describe('when the flag does not exist', () => {
    it('returns 404', async () => {
      const app = buildApp(createMockRedis());
      const res = await evaluate(app, { flag_key: 'nonexistent-flag' });
      expect(res.status).toBe(404);
    });
  });

  describe('when flag_key is missing from the body', () => {
    it('returns 400', async () => {
      const app = buildApp(createMockRedis());
      const res = await evaluate(app, {});
      expect(res.status).toBe(400);
    });
  });
});
