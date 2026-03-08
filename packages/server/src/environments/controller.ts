import type { Context } from 'hono';
import type { Db } from '../db/connection.js';
import { isUniqueViolation } from '../db/errors.js';
import { getProject } from '../projects/service.js';
import {
  createEnvironment,
  deleteEnvironment,
  getEnvironment,
  listEnvironments,
  updateEnvironment,
} from './service.js';

export function createEnvironmentsController(db: Db) {
  return {
    async list(c: Context) {
      const projectId = c.req.param('projectId') ?? '';
      const project = await getProject(db, projectId);
      if (!project)
        return c.json({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, 404);
      const data = await listEnvironments(db, projectId);
      return c.json({ data });
    },

    async create(c: Context) {
      const projectId = c.req.param('projectId') ?? '';
      const body = c.req.valid('json' as never);
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
    },

    async get(c: Context) {
      const projectId = c.req.param('projectId') ?? '';
      const { envId } = c.req.valid('param' as never);
      const data = await getEnvironment(db, envId, projectId);
      if (!data)
        return c.json({ error: { code: 'NOT_FOUND', message: 'Environment not found' } }, 404);
      return c.json({ data });
    },

    async update(c: Context) {
      const projectId = c.req.param('projectId') ?? '';
      const { envId } = c.req.valid('param' as never);
      const body = c.req.valid('json' as never);
      const update = Object.fromEntries(
        Object.entries(body as Record<string, unknown>).filter(([, v]) => v !== undefined),
      ) as { name?: string; slug?: string };
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
    },

    async remove(c: Context) {
      const projectId = c.req.param('projectId') ?? '';
      const { envId } = c.req.valid('param' as never);
      const deleted = await deleteEnvironment(db, envId, projectId);
      if (!deleted)
        return c.json({ error: { code: 'NOT_FOUND', message: 'Environment not found' } }, 404);
      return c.body(null, 204);
    },
  };
}
