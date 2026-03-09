import { createMiddleware } from 'hono/factory';
import type { Redis } from 'iovalkey';

export function rateLimit(redis: Redis, windowMs: number, max: number) {
  return createMiddleware(async (c, next) => {
    const { keyPrefix } = c.get('auth'); // only used after apiKeyAuth
    const window = Math.floor(Date.now() / windowMs);
    const key = `ratelimit:${keyPrefix}:${window}`;

    const current = await redis.incr(key);
    if (current === 1) await redis.pexpire(key, windowMs);

    if (current > max) {
      return c.json({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } }, 429);
    }

    await next();
  });
}
