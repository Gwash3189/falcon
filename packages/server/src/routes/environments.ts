import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Db } from '../db/connection.js';
import { isUniqueViolation } from '../db/errors.js';
import {
  createEnvironment,
  deleteEnvironment,
  getEnvironment,
  listEnvironments,
  updateEnvironment,
} from '../services/environments.js';
import { getProject } from '../services/projects.js';

const createSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens'),
});

// Separate update schema with explicit optional fields (satisfies exactOptionalPropertyTypes)
const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});

export function createEnvironmentsRouter(db: Db) {
  // Mounted at /api/projects/:projectId/environments
  const router = new Hono();

  router.get('/', async (c) => {
    const projectId = c.req.param('projectId')!;
    const project = await getProject(db, projectId);
    if (!project)
      return c.json({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, 404);
    const data = await listEnvironments(db, projectId);
    return c.json({ data });
  });

  router.post('/', zValidator('json', createSchema), async (c) => {
    const projectId = c.req.param('projectId')!;
    const body = c.req.valid('json');
    const project = await getProject(db, projectId);
    if (!project)
      return c.json({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, 404);
    try {
      const data = await createEnvironment(db, projectId, body);
      return c.json({ data }, 201);
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        return c.json(
          {
            error: {
              code: 'CONFLICT',
              message: 'An environment with that slug already exists in this project',
            },
          },
          409,
        );
      }
      throw err;
    }
  });

  router.get('/:envId', async (c) => {
    const projectId = c.req.param('projectId')!;
    const envId = c.req.param('envId')!;
    const data = await getEnvironment(db, envId, projectId);
    if (!data)
      return c.json({ error: { code: 'NOT_FOUND', message: 'Environment not found' } }, 404);
    return c.json({ data });
  });

  router.put('/:envId', zValidator('json', updateSchema), async (c) => {
    const projectId = c.req.param('projectId')!;
    const envId = c.req.param('envId')!;
    const body = c.req.valid('json');
    // Filter undefined values to satisfy exactOptionalPropertyTypes in Drizzle
    const update = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)) as {
      name?: string;
      slug?: string;
    };
    try {
      const data = await updateEnvironment(db, envId, projectId, update);
      if (!data)
        return c.json({ error: { code: 'NOT_FOUND', message: 'Environment not found' } }, 404);
      return c.json({ data });
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        return c.json(
          {
            error: {
              code: 'CONFLICT',
              message: 'An environment with that slug already exists in this project',
            },
          },
          409,
        );
      }
      throw err;
    }
  });

  router.delete('/:envId', async (c) => {
    const projectId = c.req.param('projectId')!;
    const envId = c.req.param('envId')!;
    const deleted = await deleteEnvironment(db, envId, projectId);
    if (!deleted)
      return c.json({ error: { code: 'NOT_FOUND', message: 'Environment not found' } }, 404);
    return c.body(null, 204);
  });

  return router;
}
