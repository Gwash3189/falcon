import type { Context } from 'hono';
import { getEnvironment } from '../environments/service.js';
import { NotFoundError } from '../errors.js';
import { listAuditLog } from './service.js';

export function createAuditLogController() {
  return {
    async list(c: Context) {
      const projectId = c.req.param('projectId') ?? '';
      const envId = c.req.param('envId') ?? '';
      const env = await getEnvironment(envId, projectId);
      if (!env) throw new NotFoundError('Environment not found');

      const flagId = c.req.query('flag_id');
      const limit = Math.min(Number(c.req.query('limit') ?? 50), 100);
      const offset = Math.max(Number(c.req.query('offset') ?? 0), 0);

      const data = await listAuditLog(envId, { flagId, limit, offset });
      return c.json({ data });
    },
  };
}
