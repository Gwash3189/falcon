import { command } from '@falcon/shared';
import { eq } from 'drizzle-orm';
import type { Db } from '../../db/connection.js';
import { type Flag, flags } from '../../db/schema/index.js';

export type Dependencies = { db: Db };
export type Params = { environmentId: string };

export const listFlagsCommand = command<Dependencies, Params, Promise<Flag[]>>(
  async ({ dependencies, params }) => {
    const { db } = dependencies;
    const { environmentId } = params;
    return db
      .select()
      .from(flags)
      .where(eq(flags.environmentId, environmentId))
      .orderBy(flags.createdAt);
  },
);
