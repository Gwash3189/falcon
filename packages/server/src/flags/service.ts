import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/connection.js';
import { type Flag, flags, type NewFlag } from '../db/schema/index.js';
import type { AuditQueue } from '../queue/client.js';

export async function listFlags(db: Db, environmentId: string): Promise<Flag[]> {
  return db
    .select()
    .from(flags)
    .where(eq(flags.environmentId, environmentId))
    .orderBy(flags.createdAt);
}

export async function getFlagByKey(
  db: Db,
  environmentId: string,
  key: string,
): Promise<Flag | null> {
  const [row] = await db
    .select()
    .from(flags)
    .where(and(eq(flags.environmentId, environmentId), eq(flags.key, key)))
    .limit(1);
  return row ?? null;
}

export async function createFlag(
  db: Db,
  queue: AuditQueue,
  environmentId: string,
  data: Pick<NewFlag, 'key' | 'type' | 'enabled' | 'percentage' | 'identifiers'>,
  actor: string | null = null,
): Promise<Flag> {
  const rows = await db
    .insert(flags)
    .values({ ...data, environmentId })
    .returning();
  const row = rows[0];
  if (!row) throw new Error('Insert did not return a row');
  await queue.add('audit-log', {
    flagId: row.id,
    environmentId,
    action: 'created',
    actor,
    beforeState: null,
    afterState: row,
  });
  return row;
}

export async function updateFlag(
  db: Db,
  queue: AuditQueue,
  environmentId: string,
  key: string,
  data: Partial<Pick<NewFlag, 'enabled' | 'percentage' | 'identifiers'>>,
  actor: string | null = null,
): Promise<Flag | null> {
  const existing = await getFlagByKey(db, environmentId, key);
  if (!existing) return null;

  const rows = await db
    .update(flags)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(flags.environmentId, environmentId), eq(flags.key, key)))
    .returning();
  const row = rows[0];
  if (!row) return null;

  await queue.add('audit-log', {
    flagId: row.id,
    environmentId,
    action: 'updated',
    actor,
    beforeState: existing,
    afterState: row,
  });
  return row;
}

export async function deleteFlag(
  db: Db,
  queue: AuditQueue,
  environmentId: string,
  key: string,
  actor: string | null = null,
): Promise<boolean> {
  const existing = await getFlagByKey(db, environmentId, key);
  if (!existing) return false;

  await db.delete(flags).where(and(eq(flags.environmentId, environmentId), eq(flags.key, key)));

  await queue.add('audit-log', {
    flagId: existing.id,
    environmentId,
    action: 'deleted',
    actor,
    beforeState: existing,
    afterState: null,
  });
  return true;
}
