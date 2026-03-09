import type { Context } from 'hono';
import { NotFoundError } from '../errors.js';
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from './service.js';

export function createProjectsController() {
  return {
    async list(c: Context) {
      const data = await listProjects();
      return c.json({ data });
    },

    async create(c: Context) {
      const body = c.req.valid('json' as never);
      const data = await createProject(body); // ConflictError bubbles to onError
      return c.json({ data }, 201);
    },

    async get(c: Context) {
      const { id } = c.req.valid('param' as never);
      const data = await getProject(id);
      if (!data) throw new NotFoundError('Project not found');
      return c.json({ data });
    },

    async update(c: Context) {
      const { id } = c.req.valid('param' as never);
      const body = c.req.valid('json' as never);
      const update = Object.fromEntries(
        Object.entries(body as Record<string, unknown>).filter(([, v]) => v !== undefined),
      ) as { name?: string; slug?: string };
      const data = await updateProject(id, update); // ConflictError bubbles to onError
      if (!data) throw new NotFoundError('Project not found');
      return c.json({ data });
    },

    async remove(c: Context) {
      const { id } = c.req.valid('param' as never);
      const deleted = await deleteProject(id);
      if (!deleted) throw new NotFoundError('Project not found');
      return c.body(null, 204);
    },
  };
}
