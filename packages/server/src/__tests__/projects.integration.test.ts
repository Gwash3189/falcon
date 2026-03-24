import { uuidv7 } from 'uuidv7';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './helpers/app.js';

describe('Projects API', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>['app'];
  let userKey: string;
  const created: string[] = [];

  beforeAll(async () => {
    ({ app, userKey } = await createTestApp());
  });

  function authHeaders() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${userKey}` };
  }

  afterEach(async () => {
    for (const id of created.splice(0)) {
      await app.request(`/api/projects/${id}`, { method: 'DELETE', headers: authHeaders() });
    }
  });

  async function postProject(name: string, slug: string) {
    const res = await app.request('/api/projects', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name, slug }),
    });
    const json = (await res.json()) as { data?: { id: string; name: string; slug: string } };
    return { res, data: json.data };
  }

  describe('GET /api/projects', () => {
    it('returns 200 with a data array', async () => {
      const res = await app.request('/api/projects', {
        headers: { Authorization: `Bearer ${userKey}` },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: unknown[] };
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('returns 401 without auth', async () => {
      const res = await app.request('/api/projects');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/projects', () => {
    describe('when the request is valid', () => {
      it('returns 201 with the created project', async () => {
        const name = uuidv7();
        const slug = uuidv7();
        const { res, data } = await postProject(name, slug);
        expect(res.status).toBe(201);
        expect(data?.name).toBe(name);
        expect(data?.slug).toBe(slug);
        expect(typeof data?.id).toBe('string');
      });
    });

    describe('when the slug is already taken', () => {
      it('returns 409 with CONFLICT error code', async () => {
        const slug = uuidv7();
        await postProject(uuidv7(), slug);
        const res = await app.request('/api/projects', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ name: uuidv7(), slug }),
        });
        expect(res.status).toBe(409);
        const body = (await res.json()) as { error: { code: string } };
        expect(body.error.code).toBe('CONFLICT');
      });
    });

    describe('when required fields are missing', () => {
      it('returns 400 when name is absent', async () => {
        const res = await app.request('/api/projects', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ slug: uuidv7() }),
        });
        expect(res.status).toBe(400);
      });

      it('returns 400 when slug is absent', async () => {
        const res = await app.request('/api/projects', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ name: uuidv7() }),
        });
        expect(res.status).toBe(400);
      });
    });

    describe('when the slug format is invalid', () => {
      it('returns 400 when slug contains uppercase letters', async () => {
        const res = await app.request('/api/projects', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ name: 'Test', slug: 'Bad_Slug' }),
        });
        expect(res.status).toBe(400);
      });
    });
  });

  describe('GET /api/projects/:id', () => {
    describe('when the project exists', () => {
      it('returns 200 with the project', async () => {
        const { data } = await postProject(uuidv7(), uuidv7());
        const res = await app.request(`/api/projects/${data?.id}`, {
          headers: { Authorization: `Bearer ${userKey}` },
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { data: { id: string; slug: string } };
        expect(body.data.id).toBe(data?.id);
        expect(body.data.slug).toBe(data?.slug);
      });
    });

    describe('when the project does not exist', () => {
      it('returns 404 with NOT_FOUND error code', async () => {
        const res = await app.request('/api/projects/00000000-0000-0000-0000-000000000000', {
          headers: { Authorization: `Bearer ${userKey}` },
        });
        expect(res.status).toBe(404);
        const body = (await res.json()) as { error: { code: string } };
        expect(body.error.code).toBe('NOT_FOUND');
      });
    });
  });

  describe('PUT /api/projects/:id', () => {
    describe('when the project exists', () => {
      it('updates and returns the project name', async () => {
        const { data } = await postProject('Old Name', uuidv7());
        const res = await app.request(`/api/projects/${data?.id}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ name: 'New Name' }),
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { data: { name: string } };
        expect(body.data.name).toBe('New Name');
      });

      it('updates and returns the project slug', async () => {
        const { data } = await postProject(uuidv7(), uuidv7());
        const newSlug = uuidv7();
        const res = await app.request(`/api/projects/${data?.id}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ slug: newSlug }),
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { data: { slug: string } };
        expect(body.data.slug).toBe(newSlug);
      });
    });

    describe('when the project does not exist', () => {
      it('returns 404', async () => {
        const res = await app.request('/api/projects/00000000-0000-0000-0000-000000000000', {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ name: 'Anything' }),
        });
        expect(res.status).toBe(404);
      });
    });
  });

  describe('DELETE /api/projects/:id', () => {
    describe('when the project exists', () => {
      it('returns 204', async () => {
        const { data } = await postProject(uuidv7(), uuidv7());
        const res = await app.request(`/api/projects/${data?.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${userKey}` },
        });
        expect(res.status).toBe(204);
      });

      it('returns 404 after deletion', async () => {
        const { data } = await postProject(uuidv7(), uuidv7());
        await app.request(`/api/projects/${data?.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${userKey}` },
        });
        const res = await app.request(`/api/projects/${data?.id}`, {
          headers: { Authorization: `Bearer ${userKey}` },
        });
        expect(res.status).toBe(404);
      });
    });

    describe('when the project does not exist', () => {
      it('returns 404', async () => {
        const res = await app.request('/api/projects/00000000-0000-0000-0000-000000000000', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${userKey}` },
        });
        expect(res.status).toBe(404);
      });
    });
  });
});
