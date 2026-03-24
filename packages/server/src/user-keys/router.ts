import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { z } from 'zod';
import type { AppConfig } from '../config.js';
import { createUserKey, listUserKeys, revokeByEmail } from './service.js';

function bootstrapAuth(bootstrapKey: string) {
  return createMiddleware(async (c, next) => {
    const authorization = c.req.header('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Missing admin key' } }, 401);
    }
    const key = authorization.slice(7);
    if (key !== bootstrapKey) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid admin key' } }, 401);
    }
    await next();
  });
}

const createKeySchema = z.object({
  email: z.string().email(),
});

export function createAdminRouter(appConfig: Pick<AppConfig, 'BOOTSTRAP_ADMIN_KEY'>) {
  const router = new Hono();
  const auth = bootstrapAuth(appConfig.BOOTSTRAP_ADMIN_KEY);

  router.post('/keys', auth, zValidator('json', createKeySchema), async (c) => {
    const { email } = c.req.valid('json');
    const key = await createUserKey(email);
    return c.json({ data: key }, 201);
  });

  router.get('/keys', auth, async (c) => {
    const keys = await listUserKeys();
    return c.json({ data: keys });
  });

  router.delete('/keys/:email', auth, async (c) => {
    const email = c.req.param('email');
    await revokeByEmail(email);
    return c.body(null, 204);
  });

  return router;
}
