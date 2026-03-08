import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, INTEGRATION, uid } from './helpers/app.js';

describe.skipIf(!INTEGRATION)('Environments API (integration)', () => {
  let app: ReturnType<typeof createTestApp>['app'];
  let projectId: string;

  beforeAll(async () => {
    ({ app } = createTestApp());

    const res = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: uid('Project'), slug: uid('proj') }),
    });
    const body = (await res.json()) as { data: { id: string } };
    projectId = body.data.id;
  });

  afterAll(async () => {
    await app.request(`/api/projects/${projectId}`, { method: 'DELETE' });
  });

  function envUrl(envId?: string) {
    const base = `/api/projects/${projectId}/environments`;
    return envId ? `${base}/${envId}` : base;
  }

  async function createEnv(name = uid('Env'), slug = uid('env')) {
    const res = await app.request(envUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug }),
    });
    const body = (await res.json()) as { data: { id: string; name: string; slug: string } };
    return { res, env: body.data };
  }

  describe('GET /…/environments', () => {
    it('returns 200 with an array', async () => {
      const res = await app.request(envUrl());
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: unknown[] };
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('returns 404 when the project does not exist', async () => {
      const res = await app.request(
        '/api/projects/00000000-0000-0000-0000-000000000000/environments',
      );
      expect(res.status).toBe(404);
    });
  });

  describe('POST /…/environments', () => {
    it('creates an environment and returns 201', async () => {
      const name = uid('Env');
      const slug = uid('env');
      const res = await app.request(envUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

    it('returns 409 when the slug is already used in the same project', async () => {
      const slug = uid('env');
      const { res: first } = await createEnv(uid('Env'), slug);
      expect(first.status).toBe(201);

      const second = await app.request(envUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: uid('Other'), slug }),
      });
      expect(second.status).toBe(409);
      const body = (await second.json()) as { error: { code: string } };
      expect(body.error.code).toBe('CONFLICT');
    });

    it('returns 400 when the slug is missing', async () => {
      const res = await app.request(envUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: uid('Env') }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 404 when the project does not exist', async () => {
      const res = await app.request(
        '/api/projects/00000000-0000-0000-0000-000000000000/environments',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'X', slug: uid('env') }),
        },
      );
      expect(res.status).toBe(404);
    });
  });

  describe('GET /…/environments/:envId', () => {
    it('returns 200 with the environment', async () => {
      const { env } = await createEnv();
      const res = await app.request(envUrl(env.id));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { id: string } };
      expect(body.data.id).toBe(env.id);
    });

    it('returns 404 for an unknown environment ID', async () => {
      const res = await app.request(envUrl('00000000-0000-0000-0000-000000000000'));
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /…/environments/:envId', () => {
    it('updates the environment name', async () => {
      const { env } = await createEnv();
      const res = await app.request(envUrl(env.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { name: string } };
      expect(body.data.name).toBe('Updated Name');
    });

    it('returns 404 when the environment does not exist', async () => {
      const res = await app.request(envUrl('00000000-0000-0000-0000-000000000000'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'x' }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /…/environments/:envId', () => {
    it('deletes the environment and returns 204', async () => {
      const { env } = await createEnv();
      const res = await app.request(envUrl(env.id), { method: 'DELETE' });
      expect(res.status).toBe(204);

      const getRes = await app.request(envUrl(env.id));
      expect(getRes.status).toBe(404);
    });

    it('returns 404 when the environment does not exist', async () => {
      const res = await app.request(envUrl('00000000-0000-0000-0000-000000000000'), {
        method: 'DELETE',
      });
      expect(res.status).toBe(404);
    });
  });
});
