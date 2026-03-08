import { FLAG_TYPES } from '@falcon/shared';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Db } from '../db/connection.js';
import type { AuditQueue } from '../queue/client.js';
import { getEnvironment } from '../services/environments.js';
import { createFlag, deleteFlag, getFlagByKey, listFlags, updateFlag } from '../services/flags.js';

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

export function createFlagsRouter(db: Db, queue: AuditQueue) {
  const router = new Hono();

  router.get('/', async (c) => {
    const projectId = c.req.param('projectId')!;
    const envId = c.req.param('envId')!;
    const env = await getEnvironment(db, envId, projectId);
    if (!env)
      return c.json({ error: { code: 'NOT_FOUND', message: 'Environment not found' } }, 404);
    const data = await listFlags(db, envId);
    return c.json({ data });
  });

  router.post('/', zValidator('json', createSchema), async (c) => {
    const projectId = c.req.param('projectId')!;
    const envId = c.req.param('envId')!;
    const body = c.req.valid('json');
    const env = await getEnvironment(db, envId, projectId);
    if (!env)
      return c.json({ error: { code: 'NOT_FOUND', message: 'Environment not found' } }, 404);
    try {
      const data = await createFlag(db, queue, envId, body);
      return c.json({ data }, 201);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('unique') || msg.includes('duplicate')) {
        return c.json(
          {
            error: {
              code: 'CONFLICT',
              message: 'A flag with that key already exists in this environment',
            },
          },
          409,
        );
      }
      throw err;
    }
  });

  router.get('/:flagKey', async (c) => {
    const projectId = c.req.param('projectId')!;
    const envId = c.req.param('envId')!;
    const flagKey = c.req.param('flagKey')!;
    const env = await getEnvironment(db, envId, projectId);
    if (!env)
      return c.json({ error: { code: 'NOT_FOUND', message: 'Environment not found' } }, 404);
    const data = await getFlagByKey(db, envId, flagKey);
    if (!data) return c.json({ error: { code: 'NOT_FOUND', message: 'Flag not found' } }, 404);
    return c.json({ data });
  });

  router.put('/:flagKey', zValidator('json', updateSchema), async (c) => {
    const projectId = c.req.param('projectId')!;
    const envId = c.req.param('envId')!;
    const flagKey = c.req.param('flagKey')!;
    const body = c.req.valid('json');
    const env = await getEnvironment(db, envId, projectId);
    if (!env)
      return c.json({ error: { code: 'NOT_FOUND', message: 'Environment not found' } }, 404);
    const data = await updateFlag(db, queue, envId, flagKey, body);
    if (!data) return c.json({ error: { code: 'NOT_FOUND', message: 'Flag not found' } }, 404);
    return c.json({ data });
  });

  router.delete('/:flagKey', async (c) => {
    const projectId = c.req.param('projectId')!;
    const envId = c.req.param('envId')!;
    const flagKey = c.req.param('flagKey')!;
    const env = await getEnvironment(db, envId, projectId);
    if (!env)
      return c.json({ error: { code: 'NOT_FOUND', message: 'Environment not found' } }, 404);
    const deleted = await deleteFlag(db, queue, envId, flagKey);
    if (!deleted) return c.json({ error: { code: 'NOT_FOUND', message: 'Flag not found' } }, 404);
    return c.body(null, 204);
  });

  return router;
}
