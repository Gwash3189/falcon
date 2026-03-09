import { command } from '@falcon/shared';
import type { Db } from '../../db/connection.js';
import { isUniqueViolation } from '../../db/errors.js';
import { type Environment, environments } from '../../db/schema/index.js';
import { ConflictError } from '../../errors.js';

export type Dependencies = { db: Db };
export type Params = { projectId: string; name: string; slug: string };

export const createEnvironmentCommand = command<Dependencies, Params, Promise<Environment>>(
  async ({ dependencies, params }) => {
    const { db } = dependencies;
    const { projectId, name, slug } = params;
    try {
      const rows = await db.insert(environments).values({ projectId, name, slug }).returning();
      const row = rows[0];
      if (!row) throw new Error('Insert did not return a row');
      return row;
    } catch (err) {
      if (isUniqueViolation(err))
        throw new ConflictError('An environment with that slug already exists in this project');
      throw err;
    }
  },
);
