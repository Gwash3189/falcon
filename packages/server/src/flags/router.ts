import { FLAG_TYPES } from '@falcon/shared';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { createFlagsController } from './controller.js';

const flagKeyParam = z.object({
  flagKey: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9_-]+$/),
});

const flagTypeValues = Object.values(FLAG_TYPES) as [string, ...string[]];

const createSchema = z
  .object({
    key: z
      .string()
      .min(1)
      .max(255)
      .regex(/^[a-z0-9_-]+$/, 'key must be lowercase alphanumeric with underscores/hyphens'),
    type: z.enum(flagTypeValues),
    enabled: z.boolean().default(false),
    percentage: z.number().int().min(0).max(100).optional(),
    identifiers: z.array(z.string().min(1)).min(1).optional(),
  })
  .refine((v) => v.type !== FLAG_TYPES.percentage || v.percentage !== undefined, {
    message: 'percentage is required for type=percentage',
    path: ['percentage'],
  })
  .refine((v) => v.type !== FLAG_TYPES.identifier || (v.identifiers && v.identifiers.length > 0), {
    message: 'identifiers is required for type=identifier',
    path: ['identifiers'],
  });

const updateSchema = z.object({
  enabled: z.boolean().optional(),
  percentage: z.number().int().min(0).max(100).optional(),
  identifiers: z.array(z.string().min(1)).min(1).optional(),
});

export function createFlagsRouter() {
  const router = new Hono();
  const ctrl = createFlagsController();

  router.get('/', ctrl.list);
  router.post('/', zValidator('json', createSchema), ctrl.create);
  router.get('/:flagKey', zValidator('param', flagKeyParam), ctrl.get);
  router.put(
    '/:flagKey',
    zValidator('param', flagKeyParam),
    zValidator('json', updateSchema),
    ctrl.update,
  );
  router.delete('/:flagKey', zValidator('param', flagKeyParam), ctrl.remove);

  return router;
}
