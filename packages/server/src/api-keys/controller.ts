import type { Context } from 'hono';
import type { Db } from '../db/connection.js';
import type { ApiKey } from '../db/schema/index.js';
import { getEnvironment } from '../environments/service.js';
import { createApiKey, listApiKeys, revokeApiKey } from './service.js';

/** Strip the internal hash before sending to the client. */
function sanitizeApiKey(apiKey: ApiKey) {
  const { keyHash: _keyHash, ...safe } = apiKey;
  return safe;
}

export function createApiKeysController(db: Db) {
  return {
    async list(c: Context) {
      const projectId = c.req.param('projectId') ?? '';
      const envId = c.req.param('envId') ?? '';
      const env = await getEnvironment(db, envId, projectId);
      if (!env)
        return c.json({ error: { code: 'NOT_FOUND', message: 'Environment not found' } }, 404);
      const keys = await listApiKeys(db, envId);
      return c.json({ data: keys.map(sanitizeApiKey) });
    },

    async create(c: Context) {
      const projectId = c.req.param('projectId') ?? '';
      const envId = c.req.param('envId') ?? '';
      const env = await getEnvironment(db, envId, projectId);
      if (!env)
        return c.json({ error: { code: 'NOT_FOUND', message: 'Environment not found' } }, 404);
      const { apiKey, rawKey } = await createApiKey(db, envId);
      // Return the raw key once — it will not be accessible again.
      return c.json({ data: { ...sanitizeApiKey(apiKey), rawKey } }, 201);
    },

    async remove(c: Context) {
      const projectId = c.req.param('projectId') ?? '';
      const envId = c.req.param('envId') ?? '';
      const { keyId } = c.req.valid('param' as never);
      const env = await getEnvironment(db, envId, projectId);
      if (!env)
        return c.json({ error: { code: 'NOT_FOUND', message: 'Environment not found' } }, 404);
      const revoked = await revokeApiKey(db, keyId, envId);
      if (!revoked)
        return c.json(
          { error: { code: 'NOT_FOUND', message: 'API key not found or already revoked' } },
          404,
        );
      return c.body(null, 204);
    },
  };
}
