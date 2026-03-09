import { command } from '@falcon/shared';
import { and, eq } from 'drizzle-orm';
import type { Db } from '../../db/connection.js';
import { type Flag, flags, type NewFlag } from '../../db/schema/index.js';
import type { AuditQueue } from '../../queue/client.js';

export type Dependencies = { db: Db; queue: AuditQueue };
export type Params = {
  environmentId: string;
  key: string;
  data: Partial<Pick<NewFlag, 'enabled' | 'percentage' | 'identifiers'>>;
  actor: string | null;
};

export const updateFlagCommand = command<Dependencies, Params, Promise<Flag | null>>(
  async ({ dependencies, params }) => {
    const { db, queue } = dependencies;
    const { environmentId, key, data, actor } = params;

    // Inline getFlagByKey to avoid cross-command coupling
    const [existing] = await db
      .select()
      .from(flags)
      .where(and(eq(flags.environmentId, environmentId), eq(flags.key, key)))
      .limit(1);
    if (!existing) return null;

    const rows = await db
      .update(flags)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(flags.environmentId, environmentId), eq(flags.key, key)))
      .returning();
    const row = rows[0];
    if (!row) return null;

    await queue.add('audit-log', {
      flagId: row.id,
      environmentId,
      action: 'updated',
      actor,
      beforeState: existing,
      afterState: row,
    });
    return row;
  },
);
