import { Queue } from 'bullmq';
import type { AuditLogJobData } from './jobs.js';
import { AUDIT_LOG_QUEUE } from './jobs.js';
import { parseRedisUrl } from './redis-url.js';

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
