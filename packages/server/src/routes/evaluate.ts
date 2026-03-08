import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import type { Db } from '../db/connection.js';
import { apiKeyAuth } from '../middleware/api-key-auth.js';
import { evaluateFlag } from '../services/evaluate.js';
import { getFlagByKey } from '../services/flags.js';

const evaluateSchema = z.object({
  flag_key: z.string().min(1),
  identifier: z.string().optional(),
});

const CACHE_TTL_SECONDS = 30;

export function createEvaluateRouter(db: Db, redis: Redis) {
  const router = new Hono();

  router.post('/', apiKeyAuth(db), zValidator('json', evaluateSchema), async (c) => {
    const { flag_key, identifier } = c.req.valid('json');
    const { environmentId } = c.get('auth');

    const cacheKey = `flag:${environmentId}:${flag_key}`;

    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      const flag = JSON.parse(cached);
      return c.json({ data: { flag_key, enabled: evaluateFlag(flag, identifier) } });
    }

    const flag = await getFlagByKey(db, environmentId, flag_key);
    if (!flag) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Flag not found' } }, 404);
    }

    // Cache the flag definition (not the result — identifier changes per request)
    await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(flag));

    return c.json({ data: { flag_key, enabled: evaluateFlag(flag, identifier) } });
  });

  return router;
}
