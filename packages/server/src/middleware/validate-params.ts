import { createMiddleware } from 'hono/factory';
import { BadRequestError } from '../errors.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const validateProjectId = createMiddleware(async (c, next) => {
  const projectId = c.req.param('projectId');
  if (projectId && !UUID_REGEX.test(projectId)) {
    throw new BadRequestError('Invalid project ID: must be a valid UUID');
  }
  await next();
});

export const validateEnvId = createMiddleware(async (c, next) => {
  const envId = c.req.param('envId');
  if (envId && !UUID_REGEX.test(envId)) {
    throw new BadRequestError('Invalid environment ID: must be a valid UUID');
  }
  await next();
});
