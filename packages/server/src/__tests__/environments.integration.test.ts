import { uuidv7 } from 'uuidv7';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './helpers/app.js';

describe('Environments API', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>['app'];
  let userKey: string;
  let projectId: string;

  beforeAll(async () => {
    ({ app, userKey } = await createTestApp());

    const res = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userKey}` },
      body: JSON.stringify({ name: 'test', slug: uuidv7() }),
    });

    const body = (await res.json()) as { data: { id: string } };
    projectId = body.data.id;
  });

  afterAll(async () => {
    await app.request(`/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userKey}` },
    });
  });

  function envUrl(envId?: string) {
    const base = `/api/projects/${projectId}/environments`;
    return envId ? `${base}/${envId}` : base;
  }

  function authHeaders() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${userKey}` };
  }

  async function createEnv(name = uuidv7(), slug = uuidv7()) {
    const res = await app.request(envUrl(), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name, slug }),
    });
    const body = (await res.json()) as { data: { id: string; name: string; slug: string } };
    return { res, env: body.data };
  }

  describe('GET /…/environments', () => {
    describe('when the project exists', () => {
      it('returns 200', async () => {
        const res = await app.request(envUrl(), { headers: { Authorization: `Bearer ${userKey}` } });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { data: unknown[] };
        expect(Array.isArray(body.data)).toBe(true);
      });

      it('returns the environment', async () => {
        const res = await app.request(envUrl(), { headers: { Authorization: `Bearer ${userKey}` } });
        const body = (await res.json()) as { data: unknown[] };
        expect(Array.isArray(body.data)).toBe(true);
      });
    });

    describe('when the project does not exist', () => {
      it('returns 404', async () => {
        const res = await app.request(
          '/api/projects/00000000-0000-0000-0000-000000000000/environments',
          { headers: { Authorization: `Bearer ${userKey}` } },
        );
        expect(res.status).toBe(404);
      });
    });
  });

  describe('POST /…/environments', () => {
    describe('when the request is valid', () => {
      it('returns 201 with the created environment', async () => {
        const name = uuidv7();
        const slug = uuidv7();
        const res = await app.request(envUrl(), {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ name, slug }),
        });
        expect(res.status).toBe(201);
        const body = (await res.json()) as {
          data: { name: string; slug: string; projectId: string };
        };
        expect(body.data.name).toBe(name);
        expect(body.data.slug).toBe(slug);
        expect(body.data.projectId).toBe(projectId);
      });
    });

    describe('when the slug is already taken', () => {
      it('returns 409 with CONFLICT error code', async () => {
        const slug = uuidv7();
        const { res: first } = await createEnv(uuidv7(), slug);
        expect(first.status).toBe(201);

        const second = await app.request(envUrl(), {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ name: 'test', slug }),
        });
        expect(second.status).toBe(409);
        const body = (await second.json()) as { error: { code: string } };
        expect(body.error.code).toBe('CONFLICT');
      });
    });

    describe('when required fields are missing', () => {
      it('returns 400 when the slug is missing', async () => {
        const res = await app.request(envUrl(), {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ name: uuidv7() }),
        });
        expect(res.status).toBe(400);
      });
    });

    describe('when the project does not exist', () => {
      it('returns 404', async () => {
        const res = await app.request(
          '/api/projects/00000000-0000-0000-0000-000000000000/environments',
          {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ name: 'X', slug: uuidv7() }),
          },
        );
        expect(res.status).toBe(404);
      });
    });
  });

  describe('GET /…/environments/:envId', () => {
    describe('when the environment exists', () => {
      it('returns 200 with the environment', async () => {
        const { env } = await createEnv();
        const res = await app.request(envUrl(env.id), {
          headers: { Authorization: `Bearer ${userKey}` },
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { data: { id: string } };
        expect(body.data.id).toBe(env.id);
      });
    });

    describe('when the environment does not exist', () => {
      it('returns 404', async () => {
        const res = await app.request(envUrl('00000000-0000-0000-0000-000000000000'), {
          headers: { Authorization: `Bearer ${userKey}` },
        });
        expect(res.status).toBe(404);
      });
    });
  });

  describe('PUT /…/environments/:envId', () => {
    describe('when the environment exists', () => {
      it('updates and returns the environment name', async () => {
        const { env } = await createEnv();
        const res = await app.request(envUrl(env.id), {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ name: 'Updated Name' }),
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { data: { name: string } };
        expect(body.data.name).toBe('Updated Name');
      });
    });

    describe('when the environment does not exist', () => {
      it('returns 404', async () => {
        const res = await app.request(envUrl('00000000-0000-0000-0000-000000000000'), {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ name: 'x' }),
        });
        expect(res.status).toBe(404);
      });
    });
  });

  describe('DELETE /…/environments/:envId', () => {
    describe('when the environment exists', () => {
      it('deletes the environment and returns 204', async () => {
        const { env } = await createEnv();
        const res = await app.request(envUrl(env.id), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${userKey}` },
        });
        expect(res.status).toBe(204);

        const getRes = await app.request(envUrl(env.id), {
          headers: { Authorization: `Bearer ${userKey}` },
        });
        expect(getRes.status).toBe(404);
      });
    });

    describe('when the environment does not exist', () => {
      it('returns 404', async () => {
        const res = await app.request(envUrl('00000000-0000-0000-0000-000000000000'), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${userKey}` },
        });
        expect(res.status).toBe(404);
      });
    });
  });
});
