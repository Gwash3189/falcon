import { command } from '@falcon/shared';
import { and, eq } from 'drizzle-orm';
import type { Db } from '../../db/connection.js';
import { environments } from '../../db/schema/index.js';

export type Dependencies = { db: Db };
export type Params = { id: string; projectId: string };

export const deleteEnvironmentCommand = command<Dependencies, Params, Promise<boolean>>(
  async ({ dependencies, params }) => {
    const { db } = dependencies;
    const { id, projectId } = params;
    const result = await db
      .delete(environments)
      .where(and(eq(environments.id, id), eq(environments.projectId, projectId)))
      .returning({ id: environments.id });
    return result.length > 0;
  },
);
