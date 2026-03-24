import { Hono } from 'hono';
import { createAuditLogController } from './controller.js';

export function createAuditLogRouter() {
  const router = new Hono();
  const ctrl = createAuditLogController();

  router.get('/', ctrl.list);

  return router;
}
