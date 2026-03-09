import { command } from '@falcon/shared';
import { and, eq } from 'drizzle-orm';
import type { Db } from '../../db/connection.js';
import { type Flag, flags } from '../../db/schema/index.js';

export type Dependencies = { db: Db };
export type Params = { environmentId: string; key: string };

export const getFlagByKeyCommand = command<Dependencies, Params, Promise<Flag | null>>(
  async ({ dependencies, params }) => {
    const { db } = dependencies;
    const { environmentId, key } = params;
    const [row] = await db
      .select()
      .from(flags)
      .where(and(eq(flags.environmentId, environmentId), eq(flags.key, key)))
      .limit(1);
    return row ?? null;
  },
);
