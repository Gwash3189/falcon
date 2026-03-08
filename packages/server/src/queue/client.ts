import { Queue } from 'bullmq';
import type { AuditLogJobData } from './jobs.js';
import { AUDIT_LOG_QUEUE } from './jobs.js';

function parseRedisUrl(redisUrl: string) {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
    db: url.pathname ? parseInt(url.pathname.slice(1), 10) || 0 : 0,
  };
}

export function createAuditQueue(redisUrl: string): Queue<AuditLogJobData> {
  return new Queue<AuditLogJobData>(AUDIT_LOG_QUEUE, {
    connection: parseRedisUrl(redisUrl),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: 1000,
    },
  });
}

export type AuditQueue = ReturnType<typeof createAuditQueue>;
