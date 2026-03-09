import { command } from '@falcon/shared';
import { and, eq } from 'drizzle-orm';
import type { Db } from '../../db/connection.js';
import { type Environment, environments } from '../../db/schema/index.js';

export type Dependencies = { db: Db };
export type Params = { id: string; projectId: string };

export const getEnvironmentCommand = command<Dependencies, Params, Promise<Environment | null>>(
  async ({ dependencies, params }) => {
    const { db } = dependencies;
    const { id, projectId } = params;
    const [row] = await db
      .select()
      .from(environments)
      .where(and(eq(environments.id, id), eq(environments.projectId, projectId)))
      .limit(1);
    return row ?? null;
  },
);
