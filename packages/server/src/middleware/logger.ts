import { logger } from '@falcon/shared';
import { createMiddleware } from 'hono/factory';

export const requestLogger = createMiddleware(async (c, next) => {
  const start = Date.now();
  logger.info('server_request_start', {
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    start,
  });
  await next();
  const duration = Date.now() - start;
  logger.info('server_request_finish', {
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration,
  });
});
