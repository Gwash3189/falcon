import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { Redis } from "iovalkey";
import { z } from "zod";
import { apiKeyAuth } from "../api-keys/auth.js";
import type { Db } from "../db/connection.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { createEvaluateController } from "./controller.js";

const evaluateSchema = z.object({
  flag_key: z.string().min(1),
  identifier: z.string().optional(),
});

export function createEvaluateRouter(db: Db, redis: Redis) {
  const router = new Hono();
  const ctrl = createEvaluateController(db, redis);

  router.post(
    "/",
    apiKeyAuth(db),
    rateLimit(redis, 60_000, 1000),
    zValidator("json", evaluateSchema),
    ctrl.evaluate,
  );

  return router;
}
