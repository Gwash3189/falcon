import { Worker } from 'bullmq';
import type { Db } from '../db/connection.js';
import { auditLog } from '../db/schema/index.js';
import { AUDIT_LOG_QUEUE, type AuditLogJobData } from './jobs.js';

function parseRedisUrl(redisUrl: string) {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
    db: url.pathname ? parseInt(url.pathname.slice(1), 10) || 0 : 0,
  };
}

export function createAuditWorker(redisUrl: string, db: Db): Worker<AuditLogJobData> {
  return new Worker<AuditLogJobData>(
    AUDIT_LOG_QUEUE,
    async (job) => {
      const { flagId, environmentId, action, actor, beforeState, afterState } = job.data;
      await db.insert(auditLog).values({
        flagId,
        environmentId,
        action,
        actor,
        beforeState: beforeState ?? null,
        afterState: afterState ?? null,
      });
    },
    { connection: parseRedisUrl(redisUrl) },
  );
}
