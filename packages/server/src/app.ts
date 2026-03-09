import { Hono } from "hono";
import type { Redis } from "iovalkey";
import { createApiKeysRouter } from "./api-keys/router.js";
import type { Db } from "./db/connection.js";
import { checkDatabase } from "./db/health.js";
import { checkRedis } from "./db/redis-health.js";
import { createEnvironmentsRouter } from "./environments/router.js";
import { AppError } from "./errors.js";
import { createEvaluateRouter } from "./evaluate/router.js";
import { createFlagsRouter } from "./flags/router.js";
import { requestLogger } from "./middleware/logger.js";
import { createProjectsRouter } from "./projects/router.js";
import type { AuditQueue } from "./queue/client.js";

interface AppDeps {
  db: Db;
  redis: Redis;
  queue: AuditQueue;
}

export function createApp(deps: AppDeps) {
  const { db, redis, queue } = deps;
  const app = new Hono();

  app.use("*", requestLogger);

  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json(
        { error: { code: err.code, message: err.message } },
        err.status as never,
      );
    }
    console.error("Unhandled error:", err);
    return c.json(
      { error: { code: "INTERNAL", message: "Internal server error" } },
      500,
    );
  });

  app.get("/health", async (c) => {
    const [dbHealthy, redisHealthy] = await Promise.all([
      checkDatabase(db),
      checkRedis(redis),
    ]);
    const timestamp = new Date().toISOString();
    if (dbHealthy && redisHealthy) {
      return c.json({ status: "ok", timestamp }, 200);
    }
    return c.json({ status: "unavailable", timestamp }, 503);
  });

  // Evaluation endpoint — authenticated by API key, separate from CRUD
  app.route("/evaluate", createEvaluateRouter(db, redis));

  // CRUD API
  const api = new Hono();
  api.route("/projects", createProjectsRouter(db));
  api.route("/projects/:projectId/environments", createEnvironmentsRouter(db));
  api.route(
    "/projects/:projectId/environments/:envId/flags",
    createFlagsRouter(db, queue),
  );
  api.route(
    "/projects/:projectId/environments/:envId/api-keys",
    createApiKeysRouter(db),
  );

  app.route("/api", api);

  return app;
}
