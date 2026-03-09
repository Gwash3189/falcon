import type { Redis } from "iovalkey";

export async function checkRedis(redis: Redis): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
