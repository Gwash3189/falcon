import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { AppError } from '../../errors.js';
import { validateEnvId, validateProjectId } from '../validate-params.js';

function createTestApp() {
  const app = new Hono();

  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json({ error: { code: err.code, message: err.message } }, err.status as never);
    }
    return c.json({ error: { code: 'INTERNAL', message: 'Unexpected' } }, 500);
  });

  app.use('/projects/:projectId/*', validateProjectId);
  app.use('/projects/:projectId/environments/:envId/*', validateEnvId);

  app.get('/projects/:projectId/environments', (c) => c.json({ ok: true }));
  app.get('/projects/:projectId/environments/:envId/flags', (c) => c.json({ ok: true }));

  return app;
}

describe('validateProjectId', () => {
  const app = createTestApp();

  it('passes valid UUID projectId', async () => {
    const res = await app.request('/projects/550e8400-e29b-41d4-a716-446655440000/environments');
    expect(res.status).toBe(200);
  });

  it('rejects non-UUID projectId', async () => {
    const res = await app.request('/projects/not-a-uuid/environments');
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('BAD_REQUEST');
  });
});

describe('validateEnvId', () => {
  const app = createTestApp();

  it('passes valid UUID envId', async () => {
    const res = await app.request(
      '/projects/550e8400-e29b-41d4-a716-446655440000/environments/660e8400-e29b-41d4-a716-446655440000/flags',
    );
    expect(res.status).toBe(200);
  });

  it('rejects non-UUID envId', async () => {
    const res = await app.request(
      '/projects/550e8400-e29b-41d4-a716-446655440000/environments/bad-uuid/flags',
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('BAD_REQUEST');
  });
});
