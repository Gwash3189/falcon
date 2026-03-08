import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, INTEGRATION, uid } from './helpers/app.js';

describe.skipIf(!INTEGRATION)('Flags API (integration)', () => {
  let app: ReturnType<typeof createTestApp>['app'];
  let projectId: string;
  let envId: string;

  beforeAll(async () => {
    ({ app } = createTestApp());

    const projRes = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: uid('Project'), slug: uid('proj') }),
    });
    const projBody = (await projRes.json()) as { data: { id: string } };
    projectId = projBody.data.id;

    const envRes = await app.request(`/api/projects/${projectId}/environments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: uid('Env'), slug: uid('env') }),
    });
    const envBody = (await envRes.json()) as { data: { id: string } };
    envId = envBody.data.id;
  });

  afterAll(async () => {
    await app.request(`/api/projects/${projectId}`, { method: 'DELETE' });
  });

  function flagUrl(flagKey?: string) {
    const base = `/api/projects/${projectId}/environments/${envId}/flags`;
    return flagKey ? `${base}/${flagKey}` : base;
  }

  async function createBooleanFlag(key = uid('flag')) {
    const res = await app.request(flagUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, type: 'boolean', enabled: false }),
    });
    const body = (await res.json()) as { data: { id: string; key: string } };
    return { res, flag: body.data };
  }

  describe('GET /..flags', () => {
    it('returns 200 with an array', async () => {
      const res = await app.request(flagUrl());
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: unknown[] };
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('returns 404 when the environment does not exist', async () => {
      const res = await app.request(
        `/api/projects/${projectId}/environments/00000000-0000-0000-0000-000000000000/flags`,
      );
      expect(res.status).toBe(404);
    });
  });

  describe('POST /..flags', () => {
    it('creates a boolean flag and returns 201', async () => {
      const key = uid('flag');
      const res = await app.request(flagUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, type: 'boolean', enabled: true }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { data: { key: string; type: string; enabled: boolean } };
      expect(body.data.key).toBe(key);
      expect(body.data.type).toBe('boolean');
      expect(body.data.enabled).toBe(true);
    });

    it('creates a percentage flag and returns 201', async () => {
      const res = await app.request(flagUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: uid('flag'), type: 'percentage', percentage: 25 }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { data: { percentage: number } };
      expect(body.data.percentage).toBe(25);
    });

    it('creates an identifier flag and returns 201', async () => {
      const res = await app.request(flagUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: uid('flag'),
          type: 'identifier',
          identifiers: ['user-1', 'user-2'],
        }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { data: { identifiers: string[] } };
      expect(body.data.identifiers).toEqual(['user-1', 'user-2']);
    });

    it('returns 409 when the flag key already exists in the environment', async () => {
      const key = uid('flag');
      const { res: first } = await createBooleanFlag(key);
      expect(first.status).toBe(201);

      const second = await app.request(flagUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, type: 'boolean' }),
      });
      expect(second.status).toBe(409);
      const body = (await second.json()) as { error: { code: string } };
      expect(body.error.code).toBe('CONFLICT');
    });

    it('returns 400 when type=percentage but percentage is missing', async () => {
      const res = await app.request(flagUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: uid('flag'), type: 'percentage' }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 when type=identifier but identifiers is missing', async () => {
      const res = await app.request(flagUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: uid('flag'), type: 'identifier' }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 when the key contains invalid characters', async () => {
      const res = await app.request(flagUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'UPPER_CASE', type: 'boolean' }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 404 when the environment does not exist', async () => {
      const res = await app.request(
        `/api/projects/${projectId}/environments/00000000-0000-0000-0000-000000000000/flags`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: uid('flag'), type: 'boolean' }),
        },
      );
      expect(res.status).toBe(404);
    });
  });

  describe('GET /..flags/:flagKey', () => {
    it('returns 200 with the flag', async () => {
      const { flag } = await createBooleanFlag();
      const res = await app.request(flagUrl(flag.key));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { key: string } };
      expect(body.data.key).toBe(flag.key);
    });

    it('returns 404 for an unknown flag key', async () => {
      const res = await app.request(flagUrl('does-not-exist'));
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /..flags/:flagKey', () => {
    it('toggles the enabled state', async () => {
      const { flag } = await createBooleanFlag();
      const res = await app.request(flagUrl(flag.key), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { enabled: boolean } };
      expect(body.data.enabled).toBe(true);
    });

    it('returns 404 for an unknown flag key', async () => {
      const res = await app.request(flagUrl('does-not-exist'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /..flags/:flagKey', () => {
    it('deletes the flag and returns 204', async () => {
      const { flag } = await createBooleanFlag();
      const res = await app.request(flagUrl(flag.key), { method: 'DELETE' });
      expect(res.status).toBe(204);

      const getRes = await app.request(flagUrl(flag.key));
      expect(getRes.status).toBe(404);
    });

    it('returns 404 when the flag does not exist', async () => {
      const res = await app.request(flagUrl('does-not-exist'), { method: 'DELETE' });
      expect(res.status).toBe(404);
    });
  });
});
