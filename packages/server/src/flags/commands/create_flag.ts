import { command } from '@falcon/shared';
import type { Db } from '../../db/connection.js';
import { isUniqueViolation } from '../../db/errors.js';
import { type Flag, flags, type NewFlag } from '../../db/schema/index.js';
import { ConflictError } from '../../errors.js';
import type { AuditQueue } from '../../queue/client.js';

export type Dependencies = { db: Db; queue: AuditQueue };
export type Params = {
  environmentId: string;
  data: Pick<NewFlag, 'key' | 'type' | 'enabled' | 'percentage' | 'identifiers'>;
  actor: string | null;
};

export const createFlagCommand = command<Dependencies, Params, Promise<Flag>>(
  async ({ dependencies, params }) => {
    const { db, queue } = dependencies;
    const { environmentId, data, actor } = params;
    let rows: Flag[];
    try {
      rows = await db
        .insert(flags)
        .values({ ...data, environmentId })
        .returning();
    } catch (err) {
      if (isUniqueViolation(err))
        throw new ConflictError('A flag with that key already exists in this environment');
      throw err;
    }
    const row = rows[0];
    if (!row) throw new Error('Insert did not return a row');
    await queue.add('audit-log', {
      flagId: row.id,
      environmentId,
      action: 'created',
      actor,
      beforeState: null,
      afterState: row,
    });
    return row;
  },
);
