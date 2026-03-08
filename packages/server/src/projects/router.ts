import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Db } from '../db/connection.js';
import { createProjectsController } from './controller.js';

const uuidParam = z.object({ id: z.string().uuid() });

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
  const ctrl = createProjectsController(db);

  router.get('/', ctrl.list);
  router.post('/', zValidator('json', createSchema), ctrl.create);
  router.get('/:id', zValidator('param', uuidParam), ctrl.get);
  router.put('/:id', zValidator('param', uuidParam), zValidator('json', updateSchema), ctrl.update);
  router.delete('/:id', zValidator('param', uuidParam), ctrl.remove);

  return router;
}
