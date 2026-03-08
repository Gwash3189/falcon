import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Db } from '../db/connection.js';
import { createEnvironmentsController } from './controller.js';

const uuidParam = z.object({ envId: z.string().uuid() });

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
  const ctrl = createEnvironmentsController(db);

  router.get('/', ctrl.list);
  router.post('/', zValidator('json', createSchema), ctrl.create);
  router.get('/:envId', zValidator('param', uuidParam), ctrl.get);
  router.put(
    '/:envId',
    zValidator('param', uuidParam),
    zValidator('json', updateSchema),
    ctrl.update,
  );
  router.delete('/:envId', zValidator('param', uuidParam), ctrl.remove);

  return router;
}
