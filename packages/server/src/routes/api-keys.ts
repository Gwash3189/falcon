import { Hono } from 'hono';
import type { Db } from '../db/connection.js';
import type { ApiKey } from '../db/schema/index.js';
import { createApiKey, listApiKeys, revokeApiKey } from '../services/api-keys.js';
import { getEnvironment } from '../services/environments.js';

/** Strip the internal hash before sending to the client. */
function sanitizeApiKey(apiKey: ApiKey) {
  const { keyHash: _keyHash, ...safe } = apiKey;
  return safe;
}

export function createApiKeysRouter(db: Db) {
  const router = new Hono();

  router.get('/', async (c) => {
    const projectId = c.req.param('projectId')!;
    const envId = c.req.param('envId')!;
    const env = await getEnvironment(db, envId, projectId);
    if (!env)
      return c.json({ error: { code: 'NOT_FOUND', message: 'Environment not found' } }, 404);
    const keys = await listApiKeys(db, envId);
    return c.json({ data: keys.map(sanitizeApiKey) });
  });

  router.post('/', async (c) => {
    const projectId = c.req.param('projectId')!;
    const envId = c.req.param('envId')!;
    const env = await getEnvironment(db, envId, projectId);
    if (!env)
      return c.json({ error: { code: 'NOT_FOUND', message: 'Environment not found' } }, 404);
    const { apiKey, rawKey } = await createApiKey(db, envId);
    // Return the raw key once — it will not be accessible again.
    // The hash is an internal detail and is never sent to clients.
    return c.json({ data: { ...sanitizeApiKey(apiKey), rawKey } }, 201);
  });

  router.delete('/:keyId', async (c) => {
    const projectId = c.req.param('projectId')!;
    const envId = c.req.param('envId')!;
    const keyId = c.req.param('keyId')!;
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
  });

  return router;
}
