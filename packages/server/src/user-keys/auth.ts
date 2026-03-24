import { createMiddleware } from 'hono/factory';
import { validateUserKey } from './service.js';

interface UserAuthContext {
  email: string;
}

// Extend Hono's context variables for user auth
declare module 'hono' {
  interface ContextVariableMap {
    userAuth: UserAuthContext;
  }
}

export function userKeyAuth() {
  return createMiddleware(async (context, next) => {
    const authorization = context.req.header('Authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return context.json({ error: { code: 'UNAUTHORIZED', message: 'Missing API key' } }, 401);
    }

    const rawKey = authorization.slice(7);
    const result = await validateUserKey(rawKey);

    if (!result) {
      return context.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid or revoked API key' } },
        401,
      );
    }

    context.set('userAuth', { email: result.email });
    await next();
  });
}
