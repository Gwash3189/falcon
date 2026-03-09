import { eq } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import type { Db } from '../db/connection.js';
import { apiKeys } from '../db/schema/index.js';
import { hashApiKey } from './hash.js';

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
  return createMiddleware(async (context, next) => {
    const authorization = context.req.header('Authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return context.json({ error: { code: 'UNAUTHORIZED', message: 'Missing API key' } }, 401);
    }

    const rawKey = authorization.slice(7);
    const keyHash = hashApiKey(rawKey);

    const [found] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash)).limit(1);

    if (!found || found.revokedAt !== null) {
      return context.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or revoked API key',
          },
        },
        401,
      );
    }

    context.set('auth', {
      environmentId: found.environmentId,
      keyPrefix: found.keyPrefix,
    });
    await next();
  });
}
