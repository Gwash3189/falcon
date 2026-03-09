import { command } from '@falcon/shared';
import { and, eq } from 'drizzle-orm';
import type { Db } from '../../db/connection.js';
import { isUniqueViolation } from '../../db/errors.js';
import { type Environment, environments } from '../../db/schema/index.js';
import { ConflictError } from '../../errors.js';

export type Dependencies = { db: Db };
export type Params = {
  id: string;
  projectId: string;
  data: { name?: string; slug?: string };
};

export const updateEnvironmentCommand = command<Dependencies, Params, Promise<Environment | null>>(
  async ({ dependencies, params }) => {
    const { db } = dependencies;
    const { id, projectId, data } = params;
    try {
      const rows = await db
        .update(environments)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(environments.id, id), eq(environments.projectId, projectId)))
        .returning();
      return rows[0] ?? null;
    } catch (err) {
      if (isUniqueViolation(err))
        throw new ConflictError('An environment with that slug already exists in this project');
      throw err;
    }
  },
);
