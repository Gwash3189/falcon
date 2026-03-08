import { Hono } from 'hono';
import type { Redis } from 'ioredis';
import type { Db } from './db/connection.js';
import { checkDatabase } from './db/health.js';
import type { AuditQueue } from './queue/client.js';
import { createApiKeysRouter } from './routes/api-keys.js';
import { createEnvironmentsRouter } from './routes/environments.js';
import { createEvaluateRouter } from './routes/evaluate.js';
import { createFlagsRouter } from './routes/flags.js';
import { createProjectsRouter } from './routes/projects.js';

interface AppDeps {
  db: Db;
  redis: Redis;
  queue: AuditQueue;
}

export function createApp(deps: AppDeps) {
  const { db, redis, queue } = deps;
  const app = new Hono();

  app.get('/health', async (c) => {
    const isHealthy = await checkDatabase(db);
    const timestamp = new Date().toISOString();
    if (isHealthy) {
      return c.json({ status: 'ok', timestamp }, 200);
    }
    return c.json({ status: 'unavailable', timestamp }, 503);
  });

  // Evaluation endpoint — authenticated by API key, separate from CRUD
  app.route('/evaluate', createEvaluateRouter(db, redis));

  // CRUD API
  const api = new Hono();
  api.route('/projects', createProjectsRouter(db));
  api.route('/projects/:projectId/environments', createEnvironmentsRouter(db));
  api.route('/projects/:projectId/environments/:envId/flags', createFlagsRouter(db, queue));
  api.route('/projects/:projectId/environments/:envId/api-keys', createApiKeysRouter(db));

  app.route('/api', api);

  return app;
}
