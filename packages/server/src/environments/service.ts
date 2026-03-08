import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/connection.js';
import { type Environment, environments, type NewEnvironment } from '../db/schema/index.js';

export async function listEnvironments(db: Db, projectId: string): Promise<Environment[]> {
  return db
    .select()
    .from(environments)
    .where(eq(environments.projectId, projectId))
    .orderBy(environments.createdAt);
}

export async function getEnvironment(
  db: Db,
  id: string,
  projectId: string,
): Promise<Environment | null> {
  const [row] = await db
    .select()
    .from(environments)
    .where(and(eq(environments.id, id), eq(environments.projectId, projectId)))
    .limit(1);
  return row ?? null;
}

export async function createEnvironment(
  db: Db,
  projectId: string,
  data: Pick<NewEnvironment, 'name' | 'slug'>,
): Promise<Environment> {
  const rows = await db
    .insert(environments)
    .values({ ...data, projectId })
    .returning();
  const row = rows[0];
  if (!row) throw new Error('Insert did not return a row');
  return row;
}

export async function updateEnvironment(
  db: Db,
  id: string,
  projectId: string,
  data: { name?: string; slug?: string },
): Promise<Environment | null> {
  const rows = await db
    .update(environments)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(environments.id, id), eq(environments.projectId, projectId)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteEnvironment(db: Db, id: string, projectId: string): Promise<boolean> {
  const result = await db
    .delete(environments)
    .where(and(eq(environments.id, id), eq(environments.projectId, projectId)))
    .returning({ id: environments.id });
  return result.length > 0;
}
