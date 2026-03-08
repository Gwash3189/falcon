import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Db } from '../db/connection.js';
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from '../services/projects.js';

const createSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens'),
});

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});

export function createProjectsRouter(db: Db) {
  const router = new Hono();

  router.get('/', async (c) => {
    const data = await listProjects(db);
    return c.json({ data });
  });

  router.post('/', zValidator('json', createSchema), async (c) => {
    const body = c.req.valid('json');
    try {
      const data = await createProject(db, body);
      return c.json({ data }, 201);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('unique') || msg.includes('duplicate')) {
        return c.json(
          { error: { code: 'CONFLICT', message: 'A project with that slug already exists' } },
          409,
        );
      }
      throw err;
    }
  });

  router.get('/:id', async (c) => {
    const id = c.req.param('id')!;
    const data = await getProject(db, id);
    if (!data) return c.json({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, 404);
    return c.json({ data });
  });

  router.put('/:id', zValidator('json', updateSchema), async (c) => {
    const id = c.req.param('id')!;
    const body = c.req.valid('json');
    try {
      const update = Object.fromEntries(
        Object.entries(body).filter(([, v]) => v !== undefined),
      ) as { name?: string; slug?: string };
      const data = await updateProject(db, id, update);
      if (!data) return c.json({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, 404);
      return c.json({ data });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('unique') || msg.includes('duplicate')) {
        return c.json(
          { error: { code: 'CONFLICT', message: 'A project with that slug already exists' } },
          409,
        );
      }
      throw err;
    }
  });

  router.delete('/:id', async (c) => {
    const id = c.req.param('id')!;
    const deleted = await deleteProject(db, id);
    if (!deleted)
      return c.json({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, 404);
    return c.body(null, 204);
  });

  return router;
}
