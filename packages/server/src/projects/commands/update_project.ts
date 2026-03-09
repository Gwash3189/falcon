import { command } from '@falcon/shared';
import { eq } from 'drizzle-orm';
import type { Db } from '../../db/connection.js';
import { isUniqueViolation } from '../../db/errors.js';
import { type Project, projects } from '../../db/schema/index.js';
import { ConflictError } from '../../errors.js';

export type Dependencies = { db: Db };
export type Params = { id: string; data: { name?: string; slug?: string } };

export const updateProjectCommand = command<Dependencies, Params, Promise<Project | null>>(
  async ({ dependencies, params }) => {
    const { db } = dependencies;
    const { id, data } = params;
    try {
      const rows = await db
        .update(projects)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .returning();
      return rows[0] ?? null;
    } catch (err) {
      if (isUniqueViolation(err))
        throw new ConflictError('A project with that slug already exists');
      throw err;
    }
  },
);
