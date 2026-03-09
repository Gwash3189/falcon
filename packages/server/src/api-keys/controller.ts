import type { Context } from 'hono';
import type { ApiKey } from '../db/schema/index.js';
import { getEnvironment } from '../environments/service.js';
import { NotFoundError } from '../errors.js';
import { createApiKey, listApiKeys, revokeApiKey } from './service.js';

/** Strip the internal hash before sending to the client. */
function sanitizeApiKey(apiKey: ApiKey) {
  const { keyHash: _keyHash, ...safe } = apiKey;
  return safe;
}

export function createApiKeysController() {
  return {
    async list(c: Context) {
      const projectId = c.req.param('projectId') ?? '';
      const envId = c.req.param('envId') ?? '';
      const env = await getEnvironment(envId, projectId);
      if (!env) throw new NotFoundError('Environment not found');
      const keys = await listApiKeys(envId);
      return c.json({ data: keys.map(sanitizeApiKey) });
    },

    async create(c: Context) {
      const projectId = c.req.param('projectId') ?? '';
      const envId = c.req.param('envId') ?? '';
      const env = await getEnvironment(envId, projectId);
      if (!env) throw new NotFoundError('Environment not found');
      const { apiKey, rawKey } = await createApiKey(envId);
      // Return the raw key once — it will not be accessible again.
      return c.json({ data: { ...sanitizeApiKey(apiKey), rawKey } }, 201);
    },

    async remove(c: Context) {
      const projectId = c.req.param('projectId') ?? '';
      const envId = c.req.param('envId') ?? '';
      const { keyId } = c.req.valid('param' as never);
      const env = await getEnvironment(envId, projectId);
      if (!env) throw new NotFoundError('Environment not found');
      const revoked = await revokeApiKey(keyId, envId);
      if (!revoked) throw new NotFoundError('API key not found or already revoked');
      return c.body(null, 204);
    },
  };
}
