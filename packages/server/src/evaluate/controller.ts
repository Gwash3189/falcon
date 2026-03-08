import type { Context } from 'hono';
import type { Redis } from 'iovalkey';
import type { Db } from '../db/connection.js';
import { getFlagByKey } from '../flags/service.js';
import { evaluateFlag } from './service.js';

const CACHE_TTL_SECONDS = 30;

export function createEvaluateController(db: Db, redis: Redis) {
  return {
    async evaluate(c: Context) {
      const { flag_key, identifier } = c.req.valid('json' as never);
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
    },
  };
}
