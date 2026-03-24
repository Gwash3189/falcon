import { uuidv7 } from 'uuidv7';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './helpers/app.js';

describe('Flags API', () => {
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

  function flagUrl(flagKey?: string) {
    const base = `/api/projects/${projectId}/environments/${envId}/flags`;
    return flagKey ? `${base}/${flagKey}` : base;
  }

  function authHeaders() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${userKey}` };
  }

  async function createBooleanFlag(key = uuidv7()) {
    const res = await app.request(flagUrl(), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ key, type: 'boolean', enabled: false }),
    });
    const body = (await res.json()) as { data: { id: string; key: string } };
    return { res, flag: body.data };
  }

  describe('GET /…/flags', () => {
    describe('when the environment exists', () => {
      it('returns 200 with an array', async () => {
        const res = await app.request(flagUrl(), { headers: { Authorization: `Bearer ${userKey}` } });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { data: unknown[] };
        expect(Array.isArray(body.data)).toBe(true);
      });
    });

    describe('when the environment does not exist', () => {
      it('returns 404', async () => {
        const res = await app.request(
          `/api/projects/${projectId}/environments/00000000-0000-0000-0000-000000000000/flags`,
          { headers: { Authorization: `Bearer ${userKey}` } },
        );
        expect(res.status).toBe(404);
      });
    });
  });

  describe('POST /…/flags', () => {
    describe('when the request is valid', () => {
      it('creates a boolean flag and returns 201', async () => {
        const key = uuidv7();
        const res = await app.request(flagUrl(), {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ key, type: 'boolean', enabled: true }),
        });
        expect(res.status).toBe(201);
        const body = (await res.json()) as {
          data: { key: string; type: string; enabled: boolean };
        };
        expect(body.data.key).toBe(key);
        expect(body.data.type).toBe('boolean');
        expect(body.data.enabled).toBe(true);
      });

      it('creates a percentage flag and returns 201', async () => {
        const res = await app.request(flagUrl(), {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ key: uuidv7(), type: 'percentage', percentage: 25 }),
        });
        expect(res.status).toBe(201);
        const body = (await res.json()) as { data: { percentage: number } };
        expect(body.data.percentage).toBe(25);
      });

      it('creates an identifier flag and returns 201', async () => {
        const res = await app.request(flagUrl(), {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            key: uuidv7(),
            type: 'identifier',
            identifiers: ['user-1', 'user-2'],
          }),
        });
        expect(res.status).toBe(201);
        const body = (await res.json()) as { data: { identifiers: string[] } };
        expect(body.data.identifiers).toEqual(['user-1', 'user-2']);
      });
    });

    describe('when the flag key already exists in the environment', () => {
      it('returns 409 with CONFLICT error code', async () => {
        const key = uuidv7();
        const { res: first } = await createBooleanFlag(key);
        expect(first.status).toBe(201);

        const second = await app.request(flagUrl(), {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ key, type: 'boolean' }),
        });
        expect(second.status).toBe(409);
        const body = (await second.json()) as { error: { code: string } };
        expect(body.error.code).toBe('CONFLICT');
      });
    });

    describe('when required type-specific fields are missing', () => {
      it('returns 400 when type=percentage but percentage is missing', async () => {
        const res = await app.request(flagUrl(), {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ key: uuidv7(), type: 'percentage' }),
        });
        expect(res.status).toBe(400);
      });

      it('returns 400 when type=identifier but identifiers is missing', async () => {
        const res = await app.request(flagUrl(), {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ key: uuidv7(), type: 'identifier' }),
        });
        expect(res.status).toBe(400);
      });
    });

    describe('when the flag key format is invalid', () => {
      it('returns 400 when the key contains invalid characters', async () => {
        const res = await app.request(flagUrl(), {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ key: 'UPPER_CASE', type: 'boolean' }),
        });
        expect(res.status).toBe(400);
      });
    });

    describe('when the environment does not exist', () => {
      it('returns 404', async () => {
        const res = await app.request(
          `/api/projects/${projectId}/environments/00000000-0000-0000-0000-000000000000/flags`,
          {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ key: uuidv7(), type: 'boolean' }),
          },
        );
        expect(res.status).toBe(404);
      });
    });
  });

  describe('GET /…/flags/:flagKey', () => {
    describe('when the flag exists', () => {
      it('returns 200 with the flag', async () => {
        const { flag } = await createBooleanFlag();
        const res = await app.request(flagUrl(flag.key), {
          headers: { Authorization: `Bearer ${userKey}` },
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { data: { key: string } };
        expect(body.data.key).toBe(flag.key);
      });
    });

    describe('when the flag does not exist', () => {
      it('returns 404', async () => {
        const res = await app.request(flagUrl('does-not-exist'), {
          headers: { Authorization: `Bearer ${userKey}` },
        });
        expect(res.status).toBe(404);
      });
    });
  });

  describe('PUT /…/flags/:flagKey', () => {
    describe('when the flag exists', () => {
      it('toggles the enabled state', async () => {
        const { flag } = await createBooleanFlag();
        const res = await app.request(flagUrl(flag.key), {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ enabled: true }),
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { data: { enabled: boolean } };
        expect(body.data.enabled).toBe(true);
      });
    });

    describe('when the flag does not exist', () => {
      it('returns 404', async () => {
        const res = await app.request(flagUrl('does-not-exist'), {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ enabled: true }),
        });
        expect(res.status).toBe(404);
      });
    });
  });

  describe('DELETE /…/flags/:flagKey', () => {
    describe('when the flag exists', () => {
      it('deletes the flag and returns 204', async () => {
        const { flag } = await createBooleanFlag();
        const res = await app.request(flagUrl(flag.key), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${userKey}` },
        });
        expect(res.status).toBe(204);

        const getRes = await app.request(flagUrl(flag.key), {
          headers: { Authorization: `Bearer ${userKey}` },
        });
        expect(getRes.status).toBe(404);
      });
    });

    describe('when the flag does not exist', () => {
      it('returns 404', async () => {
        const res = await app.request(flagUrl('does-not-exist'), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${userKey}` },
        });
        expect(res.status).toBe(404);
      });
    });
  });
});
