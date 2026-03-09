import { command } from '@falcon/shared';
import { eq } from 'drizzle-orm';
import type { Db } from '../../db/connection.js';
import { type Project, projects } from '../../db/schema/index.js';

export type Dependencies = { db: Db };
export type Params = { id: string };

export const getProjectCommand = command<Dependencies, Params, Promise<Project | null>>(
  async ({ dependencies, params }) => {
    const { db } = dependencies;
    const { id } = params;
    const [row] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return row ?? null;
  },
);
