import type { Context } from "hono";
import type { Db } from "../db/connection.js";
import { NotFoundError } from "../errors.js";
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from "./service.js";

export function createProjectsController(db: Db) {
  return {
    async list(c: Context) {
      const data = await listProjects(db);
      return c.json({ data });
    },

    async create(c: Context) {
      const body = c.req.valid("json" as never);
      const data = await createProject(db, body); // ConflictError bubbles to onError
      return c.json({ data }, 201);
    },

    async get(c: Context) {
      const { id } = c.req.valid("param" as never);
      const data = await getProject(db, id);
      if (!data) throw new NotFoundError("Project not found");
      return c.json({ data });
    },

    async update(c: Context) {
      const { id } = c.req.valid("param" as never);
      const body = c.req.valid("json" as never);
      const update = Object.fromEntries(
        Object.entries(body as Record<string, unknown>).filter(
          ([, v]) => v !== undefined,
        ),
      ) as { name?: string; slug?: string };
      const data = await updateProject(db, id, update); // ConflictError bubbles to onError
      if (!data) throw new NotFoundError("Project not found");
      return c.json({ data });
    },

    async remove(c: Context) {
      const { id } = c.req.valid("param" as never);
      const deleted = await deleteProject(db, id);
      if (!deleted) throw new NotFoundError("Project not found");
      return c.body(null, 204);
    },
  };
}
