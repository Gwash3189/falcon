import type { Redis } from 'iovalkey';
import { uuidv7 } from 'uuidv7';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { createDb } from '../db/connection.js';
import type { AuditQueue } from '../queue/client.js';
import { createUserKey } from '../user-keys/service.js';
import { DATABASE_URL } from './config.js';

const stubQueue = { add: async () => {} } as unknown as AuditQueue;
const testAppConfig = { BOOTSTRAP_ADMIN_KEY: 'test-bootstrap-key' };

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
  return createApp({ db, redis, queue: stubQueue, appConfig: testAppConfig });
}

describe('Evaluate API', () => {
  let projectId: string;
  let envId: string;
  let rawKey: string;
  let userKey: string;

  beforeAll(async () => {
    const { rawKey: uk } = await createUserKey(
      `eval-test-${Math.random().toString(36).slice(2)}@example.com`,
    );
    userKey = uk;

    const baseApp = buildApp(createMockRedis());

    const projRes = await baseApp.request('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userKey}` },
      body: JSON.stringify({ name: uuidv7(), slug: uuidv7() }),
    });
    const projBody = (await projRes.json()) as { data: { id: string } };
    projectId = projBody.data.id;

    const envRes = await baseApp.request(`/api/projects/${projectId}/environments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userKey}` },
      body: JSON.stringify({ name: uuidv7(), slug: uuidv7() }),
    });
    const envBody = (await envRes.json()) as { data: { id: string } };
    envId = envBody.data.id;

    const keyRes = await baseApp.request(
      `/api/projects/${projectId}/environments/${envId}/api-keys`,
      { method: 'POST', headers: { Authorization: `Bearer ${userKey}` } },
    );
    const keyBody = (await keyRes.json()) as { data: { rawKey: string } };
    rawKey = keyBody.data.rawKey;

    await baseApp.request(`/api/projects/${projectId}/environments/${envId}/flags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userKey}` },
      body: JSON.stringify({ key: 'my-feature', type: 'boolean', enabled: true }),
    });

    await baseApp.request(`/api/projects/${projectId}/environments/${envId}/flags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userKey}` },
      body: JSON.stringify({ key: 'pct-flag', type: 'percentage', percentage: 100 }),
    });

    await baseApp.request(`/api/projects/${projectId}/environments/${envId}/flags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userKey}` },
      body: JSON.stringify({ key: 'pct-flag-zero', type: 'percentage', percentage: 0 }),
    });

    await baseApp.request(`/api/projects/${projectId}/environments/${envId}/flags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userKey}` },
      body: JSON.stringify({ key: 'id-flag', type: 'identifier', identifiers: ['allowed-user'] }),
    });
  });

  afterAll(async () => {
    const baseApp = buildApp(createMockRedis());
    await baseApp.request(`/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userKey}` },
    });
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
      const body = (await res.json()) as { data: { flag_key: string; enabled: boolean } };
      expect(body.data.flag_key).toBe('my-feature');
      expect(typeof body.data.enabled).toBe('boolean');
    });

    it('accepts an optional identifier in the body', async () => {
      const app = buildApp(createMockRedis());
      const res = await evaluate(app, { flag_key: 'my-feature', identifier: 'user-123' });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { enabled: boolean } };
      expect(typeof body.data.enabled).toBe('boolean');
    });

    it('serves the result from cache on a second request', async () => {
      const mockRedis = createMockRedis();
      const app = buildApp(mockRedis);

      await evaluate(app, { flag_key: 'my-feature' });
      const cacheEntries = Array.from(mockRedis._store.keys()).filter((k) =>
        k.startsWith('flag:'),
      ).length;
      expect(cacheEntries).toBe(1);

      const res = await evaluate(app, { flag_key: 'my-feature' });
      expect(res.status).toBe(200);
    });
  });

  describe('percentage flag evaluation', () => {
    it('returns true for a 100% rollout', async () => {
      const app = buildApp(createMockRedis());
      const res = await evaluate(app, { flag_key: 'pct-flag', identifier: 'any-user' });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { enabled: boolean } };
      expect(body.data.enabled).toBe(true);
    });

    it('returns false for a 0% rollout', async () => {
      const app = buildApp(createMockRedis());
      const res = await evaluate(app, { flag_key: 'pct-flag-zero', identifier: 'any-user' });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { enabled: boolean } };
      expect(body.data.enabled).toBe(false);
    });
  });

  describe('identifier flag evaluation', () => {
    it('returns true for a matching identifier', async () => {
      const app = buildApp(createMockRedis());
      const res = await evaluate(app, { flag_key: 'id-flag', identifier: 'allowed-user' });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { enabled: boolean } };
      expect(body.data.enabled).toBe(true);
    });

    it('returns false for a non-matching identifier', async () => {
      const app = buildApp(createMockRedis());
      const res = await evaluate(app, { flag_key: 'id-flag', identifier: 'other-user' });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { enabled: boolean } };
      expect(body.data.enabled).toBe(false);
    });
  });

  describe('revoked SDK key', () => {
    it('returns 401 after the environment API key is revoked', async () => {
      // Create a fresh project/env/key specifically for this test
      const baseApp = buildApp(createMockRedis());
      const p = await baseApp.request('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userKey}` },
        body: JSON.stringify({ name: uuidv7(), slug: uuidv7() }),
      });
      const { data: proj } = (await p.json()) as { data: { id: string } };

      const e = await baseApp.request(`/api/projects/${proj.id}/environments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userKey}` },
        body: JSON.stringify({ name: uuidv7(), slug: uuidv7() }),
      });
      const { data: env } = (await e.json()) as { data: { id: string } };

      const k = await baseApp.request(`/api/projects/${proj.id}/environments/${env.id}/api-keys`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userKey}` },
      });
      const { data: keyData } = (await k.json()) as { data: { id: string; rawKey: string } };

      // Revoke it
      await baseApp.request(
        `/api/projects/${proj.id}/environments/${env.id}/api-keys/${keyData.id}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${userKey}` } },
      );

      // Now evaluation should 401
      const app = buildApp(createMockRedis());
      const res = await app.request('/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${keyData.rawKey}`,
        },
        body: JSON.stringify({ flag_key: 'any-flag' }),
      });
      expect(res.status).toBe(401);

      // Clean up
      await baseApp.request(`/api/projects/${proj.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userKey}` },
      });
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
