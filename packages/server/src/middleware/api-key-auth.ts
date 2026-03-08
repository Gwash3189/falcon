import { eq } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import type { Db } from '../db/connection.js';
import { apiKeys } from '../db/schema/index.js';
import { hashApiKey } from '../lib/api-key.js';

interface AuthContext {
  environmentId: string;
  keyPrefix: string;
}

// Extend Hono's context variables
declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

export function apiKeyAuth(db: Db) {
  return createMiddleware(async (c, next) => {
    const authorization = c.req.header('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Missing API key' } }, 401);
    }

    const rawKey = authorization.slice(7);
    const keyHash = hashApiKey(rawKey);

    const [found] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash)).limit(1);

    if (!found || found.revokedAt !== null) {
      return c.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid or revoked API key' } },
        401,
      );
    }

    c.set('auth', { environmentId: found.environmentId, keyPrefix: found.keyPrefix });
    await next();
  });
}
