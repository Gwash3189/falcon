import { command } from '@falcon/shared';
import { and, eq } from 'drizzle-orm';
import type { Db } from '../../db/connection.js';
import { flags } from '../../db/schema/index.js';
import type { AuditQueue } from '../../queue/client.js';

export type Dependencies = { db: Db; queue: AuditQueue };
export type Params = {
  environmentId: string;
  key: string;
  actor: string | null;
};

export const deleteFlagCommand = command<Dependencies, Params, Promise<boolean>>(
  async ({ dependencies, params }) => {
    const { db, queue } = dependencies;
    const { environmentId, key, actor } = params;

    // Inline getFlagByKey to avoid cross-command coupling
    const [existing] = await db
      .select()
      .from(flags)
      .where(and(eq(flags.environmentId, environmentId), eq(flags.key, key)))
      .limit(1);
    if (!existing) return false;

    await db.delete(flags).where(and(eq(flags.environmentId, environmentId), eq(flags.key, key)));

    await queue.add('audit-log', {
      flagId: existing.id,
      environmentId,
      action: 'deleted',
      actor,
      beforeState: existing,
      afterState: null,
    });
    return true;
  },
);
