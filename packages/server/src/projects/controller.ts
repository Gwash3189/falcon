import type { Context } from 'hono';
import type { Db } from '../db/connection.js';
import { isUniqueViolation } from '../db/errors.js';
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from './service.js';

export function createProjectsController(db: Db) {
  return {
    async list(c: Context) {
      const data = await listProjects(db);
      return c.json({ data });
    },

    async create(c: Context) {
      const body = c.req.valid('json' as never);
      try {
        const data = await createProject(db, body);
        return c.json({ data }, 201);
      } catch (err: unknown) {
        if (isUniqueViolation(err)) {
          return c.json(
            { error: { code: 'CONFLICT', message: 'A project with that slug already exists' } },
            409,
          );
        }
        throw err;
      }
    },

    async get(c: Context) {
      const { id } = c.req.valid('param' as never);
      const data = await getProject(db, id);
      if (!data) return c.json({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, 404);
      return c.json({ data });
    },

    async update(c: Context) {
      const { id } = c.req.valid('param' as never);
      const body = c.req.valid('json' as never);
      try {
        const update = Object.fromEntries(
          Object.entries(body as Record<string, unknown>).filter(([, v]) => v !== undefined),
        ) as { name?: string; slug?: string };
        const data = await updateProject(db, id, update);
        if (!data)
          return c.json({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, 404);
        return c.json({ data });
      } catch (err: unknown) {
        if (isUniqueViolation(err)) {
          return c.json(
            { error: { code: 'CONFLICT', message: 'A project with that slug already exists' } },
            409,
          );
        }
        throw err;
      }
    },

    async remove(c: Context) {
      const { id } = c.req.valid('param' as never);
      const deleted = await deleteProject(db, id);
      if (!deleted)
        return c.json({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, 404);
      return c.body(null, 204);
    },
  };
}
