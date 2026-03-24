import { command } from '@falcon/shared';
import { and, desc, eq } from 'drizzle-orm';
import type { Db } from '../../db/connection.js';
import { type AuditLogEntry, auditLog } from '../../db/schema/index.js';

export type Dependencies = { db: Db };
export type Params = {
  environmentId: string;
  flagId?: string;
  limit: number;
  offset: number;
};

export const listAuditLogCommand = command<Dependencies, Params, Promise<AuditLogEntry[]>>(
  async ({ dependencies, params }) => {
    const { db } = dependencies;
    const { environmentId, flagId, limit, offset } = params;

    const conditions = [eq(auditLog.environmentId, environmentId)];
    if (flagId) {
      conditions.push(eq(auditLog.flagId, flagId));
    }

    return db
      .select()
      .from(auditLog)
      .where(and(...conditions))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset(offset);
  },
);
