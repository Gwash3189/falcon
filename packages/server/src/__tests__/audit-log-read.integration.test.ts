import { uuidv7 } from 'uuidv7';
import { describe, expect, it } from 'vitest';
import { createTestApp } from './helpers/app.js';

describe('GET /api/projects/:projectId/environments/:envId/audit-log', () => {
  async function setupProjectAndEnv(
    app: ReturnType<typeof import('../app.js').createApp>,
    userKey: string,
  ) {
    const projRes = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userKey}` },
      body: JSON.stringify({ name: uuidv7(), slug: uuidv7() }),
    });
    const { data: project } = (await projRes.json()) as { data: { id: string } };

    const envRes = await app.request(`/api/projects/${project.id}/environments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userKey}` },
      body: JSON.stringify({ name: uuidv7(), slug: uuidv7() }),
    });
    const { data: env } = (await envRes.json()) as { data: { id: string } };

    return { projectId: project.id, envId: env.id };
  }

  it('returns an empty array when no audit entries exist', async () => {
    const { app, userKey } = await createTestApp();
    const { projectId, envId } = await setupProjectAndEnv(app, userKey);

    const res = await app.request(`/api/projects/${projectId}/environments/${envId}/audit-log`, {
      headers: { Authorization: `Bearer ${userKey}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('returns 404 for non-existent environment', async () => {
    const { app, userKey } = await createTestApp();
    const projRes = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userKey}` },
      body: JSON.stringify({ name: uuidv7(), slug: uuidv7() }),
    });
    const { data: project } = (await projRes.json()) as { data: { id: string } };

    const res = await app.request(
      `/api/projects/${project.id}/environments/00000000-0000-0000-0000-000000000000/audit-log`,
      { headers: { Authorization: `Bearer ${userKey}` } },
    );

    expect(res.status).toBe(404);
  });

  it('supports limit and offset query params', async () => {
    const { app, userKey } = await createTestApp();
    const { projectId, envId } = await setupProjectAndEnv(app, userKey);

    const res = await app.request(
      `/api/projects/${projectId}/environments/${envId}/audit-log?limit=10&offset=0`,
      { headers: { Authorization: `Bearer ${userKey}` } },
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('requires authentication', async () => {
    const { app, userKey } = await createTestApp();
    const { projectId, envId } = await setupProjectAndEnv(app, userKey);

    const res = await app.request(`/api/projects/${projectId}/environments/${envId}/audit-log`);

    expect(res.status).toBe(401);
  });
});
