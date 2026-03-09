import { command } from '@falcon/shared';
import { eq } from 'drizzle-orm';
import type { Db } from '../../db/connection.js';
import { projects } from '../../db/schema/index.js';

export type Dependencies = { db: Db };
export type Params = { id: string };

export const deleteProjectCommand = command<Dependencies, Params, Promise<boolean>>(
  async ({ dependencies, params }) => {
    const { db } = dependencies;
    const { id } = params;
    const result = await db
      .delete(projects)
      .where(eq(projects.id, id))
      .returning({ id: projects.id });
    return result.length > 0;
  },
);
