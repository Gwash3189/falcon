import { command } from '@falcon/shared';
import type { Db } from '../../db/connection.js';
import { isUniqueViolation } from '../../db/errors.js';
import { type Project, projects } from '../../db/schema/index.js';
import { ConflictError } from '../../errors.js';

export type Dependencies = { db: Db };
export type Params = { name: string; slug: string };

export const createProjectCommand = command<Dependencies, Params, Promise<Project>>(
  async ({ dependencies, params }) => {
    const { db } = dependencies;
    const { name, slug } = params;
    try {
      const rows = await db.insert(projects).values({ name, slug }).returning();
      const row = rows[0];
      if (!row) throw new Error('Insert did not return a row');
      return row;
    } catch (err) {
      if (isUniqueViolation(err))
        throw new ConflictError('A project with that slug already exists');
      throw err;
    }
  },
);
