import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { INTEGRATION, createTestApp, uid } from './helpers/app.js';

describe.skipIf(!INTEGRATION)('Projects API (integration)', () => {
  let app: ReturnType<typeof createTestApp>['app'];

  // IDs of projects created during tests — cleaned up in afterEach
  const created: string[] = [];

  beforeAll(() => {
    ({ app } = createTestApp());
  });

  afterEach(async () => {
    for (const id of created.splice(0)) {
      await app.request(`/api/projects/${id}`, { method: 'DELETE' });
    }
  });

  async function postProject(name: string, slug: string) {
    const res = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug }),
    });
    if (res.status === 201) {
      const body = (await res.json()) as { data: { id: string; name: string; slug: string } };
      created.push(body.data.id);
      return { res, data: body.data };
    }
    return { res, data: null };
  }

  describe('GET /api/projects', () => {
    it('returns 200 with a data array', async () => {
      const res = await app.request('/api/projects');
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: unknown[] };
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('POST /api/projects', () => {
    it('creates a project and returns 201', async () => {
      const name = uid('Project');
      const slug = uid('proj');
      const { res, data } = await postProject(name, slug);
      expect(res.status).toBe(201);
      expect(data?.name).toBe(name);
      expect(data?.slug).toBe(slug);
      expect(typeof data?.id).toBe('string');
    });

    it('returns 409 when the slug is already taken', async () => {
      const slug = uid('proj');
      const { res: first } = await postProject(uid('Project'), slug);
      expect(first.status).toBe(201);

      const second = await app.request('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: uid('Other'), slug }),
      });
      expect(second.status).toBe(409);
      const body = (await second.json()) as { error: { code: string } };
      expect(body.error.code).toBe('CONFLICT');
    });

    it('returns 400 when name is missing', async () => {
      const res = await app.request('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: uid('proj') }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 when slug contains uppercase letters', async () => {
      const res = await app.request('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test', slug: 'Bad_Slug' }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 when slug is missing', async () => {
      const res = await app.request('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: uid('Project') }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('returns 200 with the project', async () => {
      const { data } = await postProject(uid('Project'), uid('proj'));
      const res = await app.request(`/api/projects/${data!.id}`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { id: string; slug: string } };
      expect(body.data.id).toBe(data!.id);
      expect(body.data.slug).toBe(data!.slug);
    });

    it('returns 404 for an unknown project ID', async () => {
      const res = await app.request('/api/projects/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('updates the project name', async () => {
      const { data } = await postProject('Old Name', uid('proj'));
      const res = await app.request(`/api/projects/${data!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Name' }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { name: string } };
      expect(body.data.name).toBe('New Name');
    });

    it('updates the project slug', async () => {
      const { data } = await postProject(uid('Project'), uid('proj'));
      const newSlug = uid('proj');
      const res = await app.request(`/api/projects/${data!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: newSlug }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { slug: string } };
      expect(body.data.slug).toBe(newSlug);
    });

    it('returns 404 for an unknown project ID', async () => {
      const res = await app.request('/api/projects/00000000-0000-0000-0000-000000000000', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Anything' }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('deletes the project and returns 204', async () => {
      const { data } = await postProject(uid('Project'), uid('proj'));
      const res = await app.request(`/api/projects/${data!.id}`, { method: 'DELETE' });
      expect(res.status).toBe(204);
      const idx = created.indexOf(data!.id);
      if (idx !== -1) created.splice(idx, 1);

      const getRes = await app.request(`/api/projects/${data!.id}`);
      expect(getRes.status).toBe(404);
    });

    it('returns 404 when the project does not exist', async () => {
      const res = await app.request('/api/projects/00000000-0000-0000-0000-000000000000', {
        method: 'DELETE',
      });
      expect(res.status).toBe(404);
    });
  });
});
