import type { Redis } from 'iovalkey';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { createDb } from '../db/connection.js';
import type { AuditQueue } from '../queue/client.js';
import { INTEGRATION, uid } from './helpers/app.js';

const DATABASE_URL = process.env.DATABASE_URL ?? '';

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
  } as unknown as Redis & { _store: Map<string, string> };
}

function buildApp(redis: Redis) {
  const db = createDb(DATABASE_URL);
  return createApp({ db, redis, queue: stubQueue });
}

describe.skipIf(!INTEGRATION)('Evaluate API (integration)', () => {
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
      body: JSON.stringify({ key: 'my-feature', type: 'boolean', enabled: true }),
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

  it('returns 401 when no Authorization header is present', async () => {
    const app = buildApp(createMockRedis());
    const res = await app.request('/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flag_key: 'my-feature' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 for an invalid API key', async () => {
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

  it('evaluates a flag and returns the result', async () => {
    const app = buildApp(createMockRedis());
    const res = await evaluate(app, { flag_key: 'my-feature' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { flag_key: string; enabled: boolean } };
    expect(body.data.flag_key).toBe('my-feature');
    expect(typeof body.data.enabled).toBe('boolean');
  });

  it('returns 404 when the flag does not exist', async () => {
    const app = buildApp(createMockRedis());
    const res = await evaluate(app, { flag_key: 'nonexistent-flag' });
    expect(res.status).toBe(404);
  });

  it('returns 400 when flag_key is missing from the body', async () => {
    const app = buildApp(createMockRedis());
    const res = await evaluate(app, {});
    expect(res.status).toBe(400);
  });

  it('serves the result from cache on a second request', async () => {
    const mockRedis = createMockRedis();
    const app = buildApp(mockRedis);

    await evaluate(app, { flag_key: 'my-feature' });
    expect(mockRedis._store.size).toBe(1);

    const res = await evaluate(app, { flag_key: 'my-feature' });
    expect(res.status).toBe(200);
  });

  it('accepts an optional identifier in the body', async () => {
    const app = buildApp(createMockRedis());
    const res = await evaluate(app, { flag_key: 'my-feature', identifier: 'user-123' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { enabled: boolean } };
    expect(typeof body.data.enabled).toBe('boolean');
  });
});
