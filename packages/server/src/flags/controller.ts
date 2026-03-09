import type { Context } from "hono";
import type { Db } from "../db/connection.js";
import { getEnvironment } from "../environments/service.js";
import { NotFoundError } from "../errors.js";
import type { AuditQueue } from "../queue/client.js";
import {
  createFlag,
  deleteFlag,
  getFlagByKey,
  listFlags,
  updateFlag,
} from "./service.js";

export function createFlagsController(db: Db, queue: AuditQueue) {
  return {
    async list(c: Context) {
      const projectId = c.req.param("projectId") ?? "";
      const envId = c.req.param("envId") ?? "";
      const env = await getEnvironment(db, envId, projectId);
      if (!env) throw new NotFoundError("Environment not found");
      const data = await listFlags(db, envId);
      return c.json({ data });
    },

    async create(c: Context) {
      const projectId = c.req.param("projectId") ?? "";
      const envId = c.req.param("envId") ?? "";
      const body = c.req.valid("json" as never);
      const env = await getEnvironment(db, envId, projectId);
      if (!env) throw new NotFoundError("Environment not found");
      const data = await createFlag(db, queue, envId, body); // ConflictError bubbles
      return c.json({ data }, 201);
    },

    async get(c: Context) {
      const projectId = c.req.param("projectId") ?? "";
      const envId = c.req.param("envId") ?? "";
      const { flagKey } = c.req.valid("param" as never);
      const env = await getEnvironment(db, envId, projectId);
      if (!env) throw new NotFoundError("Environment not found");
      const data = await getFlagByKey(db, envId, flagKey);
      if (!data) throw new NotFoundError("Flag not found");
      return c.json({ data });
    },

    async update(c: Context) {
      const projectId = c.req.param("projectId") ?? "";
      const envId = c.req.param("envId") ?? "";
      const { flagKey } = c.req.valid("param" as never);
      const body = c.req.valid("json" as never);
      const env = await getEnvironment(db, envId, projectId);
      if (!env) throw new NotFoundError("Environment not found");
      const data = await updateFlag(db, queue, envId, flagKey, body);
      if (!data) throw new NotFoundError("Flag not found");
      return c.json({ data });
    },

    async remove(c: Context) {
      const projectId = c.req.param("projectId") ?? "";
      const envId = c.req.param("envId") ?? "";
      const { flagKey } = c.req.valid("param" as never);
      const env = await getEnvironment(db, envId, projectId);
      if (!env) throw new NotFoundError("Environment not found");
      const deleted = await deleteFlag(db, queue, envId, flagKey);
      if (!deleted) throw new NotFoundError("Flag not found");
      return c.body(null, 204);
    },
  };
}
