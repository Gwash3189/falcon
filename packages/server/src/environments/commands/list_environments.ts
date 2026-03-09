import { command } from '@falcon/shared';
import { eq } from 'drizzle-orm';
import type { Db } from '../../db/connection.js';
import { type Environment, environments } from '../../db/schema/index.js';

export type Dependencies = { db: Db };
export type Params = { projectId: string };

export const listEnvironmentsCommand = command<Dependencies, Params, Promise<Environment[]>>(
  async ({ dependencies, params }) => {
    const { db } = dependencies;
    const { projectId } = params;
    return db
      .select()
      .from(environments)
      .where(eq(environments.projectId, projectId))
      .orderBy(environments.createdAt);
  },
);
