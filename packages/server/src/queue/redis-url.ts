export interface RedisConnectionOptions {
  host: string;
  port: number;
  password: string | undefined;
  db: number;
}

export function parseRedisUrl(redisUrl: string): RedisConnectionOptions {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
    db: url.pathname ? parseInt(url.pathname.slice(1), 10) || 0 : 0,
  };
}
