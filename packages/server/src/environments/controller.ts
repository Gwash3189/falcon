import type { Context } from 'hono';
import type { Db } from '../db/connection.js';
import { NotFoundError } from '../errors.js';
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
      if (!project) throw new NotFoundError('Project not found');
      const data = await listEnvironments(db, projectId);
      return c.json({ data });
    },

    async create(c: Context) {
      const projectId = c.req.param('projectId') ?? '';
      const body = c.req.valid('json' as never);
      const project = await getProject(db, projectId);
      if (!project) throw new NotFoundError('Project not found');
      const data = await createEnvironment(db, projectId, body); // ConflictError bubbles
      return c.json({ data }, 201);
    },

    async get(c: Context) {
      const projectId = c.req.param('projectId') ?? '';
      const { envId } = c.req.valid('param' as never);
      const data = await getEnvironment(db, envId, projectId);
      if (!data) throw new NotFoundError('Environment not found');
      return c.json({ data });
    },

    async update(c: Context) {
      const projectId = c.req.param('projectId') ?? '';
      const { envId } = c.req.valid('param' as never);
      const body = c.req.valid('json' as never);
      const update = Object.fromEntries(
        Object.entries(body as Record<string, unknown>).filter(([, v]) => v !== undefined),
      ) as { name?: string; slug?: string };
      const data = await updateEnvironment(db, envId, projectId, update); // ConflictError bubbles
      if (!data) throw new NotFoundError('Environment not found');
      return c.json({ data });
    },

    async remove(c: Context) {
      const projectId = c.req.param('projectId') ?? '';
      const { envId } = c.req.valid('param' as never);
      const deleted = await deleteEnvironment(db, envId, projectId);
      if (!deleted) throw new NotFoundError('Environment not found');
      return c.body(null, 204);
    },
  };
}
