import { Hono } from "hono";
import { checkDatabase } from "./db/health.js";
import type { Db } from "./db/connection.js";

export function createApp(deps: { db: Db }) {
  const app = new Hono();

  app.get("/health", async (c) => {
    const isHealthy = await checkDatabase(deps.db);
    const timestamp = new Date().toISOString();

    if (isHealthy) {
      return c.json({ status: "ok", timestamp }, 200);
    }
    return c.json({ status: "unavailable", timestamp }, 503);
  });

  return app;
}
