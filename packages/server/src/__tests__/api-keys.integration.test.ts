import { uuidv7 } from 'uuidv7';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './helpers/app.js';

describe('API Keys', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>['app'];
  let userKey: string;
  let projectId: string;
  let envId: string;

  beforeAll(async () => {
    ({ app, userKey } = await createTestApp());

    const projRes = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userKey}` },
      body: JSON.stringify({ name: uuidv7(), slug: uuidv7() }),
    });
    const projBody = (await projRes.json()) as { data: { id: string } };
    projectId = projBody.data.id;

    const envRes = await app.request(`/api/projects/${projectId}/environments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userKey}` },
      body: JSON.stringify({ name: uuidv7(), slug: uuidv7() }),
    });
    const envBody = (await envRes.json()) as { data: { id: string } };
    envId = envBody.data.id;
  });

  afterAll(async () => {
    await app.request(`/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userKey}` },
    });
  });

  function apiKeyUrl(keyId?: string) {
    const base = `/api/projects/${projectId}/environments/${envId}/api-keys`;
    return keyId ? `${base}/${keyId}` : base;
  }

  function authHeaders() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${userKey}` };
  }

  describe('GET /…/api-keys', () => {
    describe('when the environment exists', () => {
      it('returns 200 with an array', async () => {
        const res = await app.request(apiKeyUrl(), { headers: { Authorization: `Bearer ${userKey}` } });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { data: unknown[] };
        expect(Array.isArray(body.data)).toBe(true);
      });
    });

    describe('when the environment does not exist', () => {
      it('returns 404', async () => {
        const res = await app.request(
          `/api/projects/${projectId}/environments/00000000-0000-0000-0000-000000000000/api-keys`,
          { headers: { Authorization: `Bearer ${userKey}` } },
        );
        expect(res.status).toBe(404);
      });
    });
  });

  describe('POST /…/api-keys', () => {
    describe('when the environment exists', () => {
      it('returns 201 with the raw key and does not expose the key hash', async () => {
        const res = await app.request(apiKeyUrl(), {
          method: 'POST',
          headers: { Authorization: `Bearer ${userKey}` },
        });
        expect(res.status).toBe(201);
        const body = (await res.json()) as {
          data: Record<string, unknown> & { id: string; rawKey: string; keyPrefix: string };
        };
        expect(typeof body.data.id).toBe('string');
        expect(body.data.rawKey.startsWith('flk_')).toBe(true);
        expect(typeof body.data.keyPrefix).toBe('string');
        expect(body.data).not.toHaveProperty('keyHash');
      });
    });

    describe('when the environment does not exist', () => {
      it('returns 404', async () => {
        const res = await app.request(
          `/api/projects/${projectId}/environments/00000000-0000-0000-0000-000000000000/api-keys`,
          { method: 'POST', headers: { Authorization: `Bearer ${userKey}` } },
        );
        expect(res.status).toBe(404);
      });
    });
  });

  describe('DELETE /…/api-keys/:keyId (revoke)', () => {
    describe('when the key exists and is active', () => {
      it('revokes the key and returns 204', async () => {
        const createRes = await app.request(apiKeyUrl(), {
          method: 'POST',
          headers: { Authorization: `Bearer ${userKey}` },
        });
        const { data } = (await createRes.json()) as { data: { id: string } };

        const res = await app.request(apiKeyUrl(data.id), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${userKey}` },
        });
        expect(res.status).toBe(204);
      });

      it('does not show revoked keys in the list', async () => {
        const createRes = await app.request(apiKeyUrl(), {
          method: 'POST',
          headers: { Authorization: `Bearer ${userKey}` },
        });
        const { data } = (await createRes.json()) as { data: { id: string } };

        await app.request(apiKeyUrl(data.id), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${userKey}` },
        });

        const listRes = await app.request(apiKeyUrl(), {
          headers: { Authorization: `Bearer ${userKey}` },
        });
        const listBody = (await listRes.json()) as { data: { id: string }[] };
        const ids = listBody.data.map((k) => k.id);
        expect(ids).not.toContain(data.id);
      });
    });

    describe('when the key has already been revoked', () => {
      it('returns 404', async () => {
        const createRes = await app.request(apiKeyUrl(), {
          method: 'POST',
          headers: { Authorization: `Bearer ${userKey}` },
        });
        const { data } = (await createRes.json()) as { data: { id: string } };

        await app.request(apiKeyUrl(data.id), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${userKey}` },
        });

        const secondRevoke = await app.request(apiKeyUrl(data.id), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${userKey}` },
        });
        expect(secondRevoke.status).toBe(404);
      });
    });

    describe('when the key does not exist', () => {
      it('returns 404', async () => {
        const res = await app.request(apiKeyUrl('00000000-0000-0000-0000-000000000000'), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${userKey}` },
        });
        expect(res.status).toBe(404);
      });
    });
  });
});
