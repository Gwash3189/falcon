import type { Context } from 'hono';
import type { Db } from '../db/connection.js';
import { isUniqueViolation } from '../db/errors.js';
import { getEnvironment } from '../environments/service.js';
import type { AuditQueue } from '../queue/client.js';
import { createFlag, deleteFlag, getFlagByKey, listFlags, updateFlag } from './service.js';

export function createFlagsController(db: Db, queue: AuditQueue) {
  return {
    async list(c: Context) {
      const projectId = c.req.param('projectId') ?? '';
      const envId = c.req.param('envId') ?? '';
      const env = await getEnvironment(db, envId, projectId);
      if (!env)
        return c.json({ error: { code: 'NOT_FOUND', message: 'Environment not found' } }, 404);
      const data = await listFlags(db, envId);
      return c.json({ data });
    },

    async create(c: Context) {
      const projectId = c.req.param('projectId') ?? '';
      const envId = c.req.param('envId') ?? '';
      const body = c.req.valid('json' as never);
      const env = await getEnvironment(db, envId, projectId);
      if (!env)
        return c.json({ error: { code: 'NOT_FOUND', message: 'Environment not found' } }, 404);
      try {
        const data = await createFlag(db, queue, envId, body);
        return c.json({ data }, 201);
      } catch (err: unknown) {
        if (isUniqueViolation(err)) {
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
    },

    async get(c: Context) {
      const projectId = c.req.param('projectId') ?? '';
      const envId = c.req.param('envId') ?? '';
      const { flagKey } = c.req.valid('param' as never);
      const env = await getEnvironment(db, envId, projectId);
      if (!env)
        return c.json({ error: { code: 'NOT_FOUND', message: 'Environment not found' } }, 404);
      const data = await getFlagByKey(db, envId, flagKey);
      if (!data) return c.json({ error: { code: 'NOT_FOUND', message: 'Flag not found' } }, 404);
      return c.json({ data });
    },

    async update(c: Context) {
      const projectId = c.req.param('projectId') ?? '';
      const envId = c.req.param('envId') ?? '';
      const { flagKey } = c.req.valid('param' as never);
      const body = c.req.valid('json' as never);
      const env = await getEnvironment(db, envId, projectId);
      if (!env)
        return c.json({ error: { code: 'NOT_FOUND', message: 'Environment not found' } }, 404);
      const data = await updateFlag(db, queue, envId, flagKey, body);
      if (!data) return c.json({ error: { code: 'NOT_FOUND', message: 'Flag not found' } }, 404);
      return c.json({ data });
    },

    async remove(c: Context) {
      const projectId = c.req.param('projectId') ?? '';
      const envId = c.req.param('envId') ?? '';
      const { flagKey } = c.req.valid('param' as never);
      const env = await getEnvironment(db, envId, projectId);
      if (!env)
        return c.json({ error: { code: 'NOT_FOUND', message: 'Environment not found' } }, 404);
      const deleted = await deleteFlag(db, queue, envId, flagKey);
      if (!deleted) return c.json({ error: { code: 'NOT_FOUND', message: 'Flag not found' } }, 404);
      return c.body(null, 204);
    },
  };
}
