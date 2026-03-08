import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INTEGRATION, createTestApp, uid } from './helpers/app.js';

describe.skipIf(!INTEGRATION)('API Keys (integration)', () => {
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

  function apiKeyUrl(keyId?: string) {
    const base = `/api/projects/${projectId}/environments/${envId}/api-keys`;
    return keyId ? `${base}/${keyId}` : base;
  }

  describe('GET /..api-keys', () => {
    it('returns 200 with an array', async () => {
      const res = await app.request(apiKeyUrl());
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: unknown[] };
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('returns 404 when the environment does not exist', async () => {
      const res = await app.request(
        `/api/projects/${projectId}/environments/00000000-0000-0000-0000-000000000000/api-keys`,
      );
      expect(res.status).toBe(404);
    });
  });

  describe('POST /..api-keys', () => {
    it('creates an API key and returns 201 with the raw key', async () => {
      const res = await app.request(apiKeyUrl(), { method: 'POST' });
      expect(res.status).toBe(201);
      const body = (await res.json()) as {
        data: { id: string; rawKey: string; keyPrefix: string };
      };
      expect(typeof body.data.id).toBe('string');
      expect(body.data.rawKey.startsWith('flk_')).toBe(true);
      expect(typeof body.data.keyPrefix).toBe('string');
    });

    it('does not expose the key hash in the response', async () => {
      const res = await app.request(apiKeyUrl(), { method: 'POST' });
      const body = (await res.json()) as { data: Record<string, unknown> };
      expect(body.data).not.toHaveProperty('keyHash');
    });

    it('returns 404 when the environment does not exist', async () => {
      const res = await app.request(
        `/api/projects/${projectId}/environments/00000000-0000-0000-0000-000000000000/api-keys`,
        { method: 'POST' },
      );
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /..api-keys/:keyId (revoke)', () => {
    it('revokes the key and returns 204', async () => {
      const createRes = await app.request(apiKeyUrl(), { method: 'POST' });
      const { data } = (await createRes.json()) as { data: { id: string } };

      const res = await app.request(apiKeyUrl(data.id), { method: 'DELETE' });
      expect(res.status).toBe(204);
    });

    it('returns 404 when attempting to revoke a key that was already revoked', async () => {
      const createRes = await app.request(apiKeyUrl(), { method: 'POST' });
      const { data } = (await createRes.json()) as { data: { id: string } };

      await app.request(apiKeyUrl(data.id), { method: 'DELETE' });

      const secondRevoke = await app.request(apiKeyUrl(data.id), { method: 'DELETE' });
      expect(secondRevoke.status).toBe(404);
    });

    it('returns 404 for a non-existent key ID', async () => {
      const res = await app.request(apiKeyUrl('00000000-0000-0000-0000-000000000000'), {
        method: 'DELETE',
      });
      expect(res.status).toBe(404);
    });

    it('does not show revoked keys in the list', async () => {
      const createRes = await app.request(apiKeyUrl(), { method: 'POST' });
      const { data } = (await createRes.json()) as { data: { id: string } };

      await app.request(apiKeyUrl(data.id), { method: 'DELETE' });

      const listRes = await app.request(apiKeyUrl());
      const listBody = (await listRes.json()) as { data: { id: string }[] };
      const ids = listBody.data.map((k) => k.id);
      expect(ids).not.toContain(data.id);
    });
  });
});
