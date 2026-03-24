import { and, eq, isNull } from 'drizzle-orm';
import { generateApiKey, hashApiKey, verifyApiKey } from '../api-keys/hash.js';
import { config } from '../config.js';
import { createDb } from '../db/connection.js';
import { userApiKeys } from '../db/schema/index.js';

function db() {
  return createDb(config().DATABASE_URL);
}

export interface CreatedUserKey {
  id: string;
  email: string;
  keyPrefix: string;
  rawKey: string;
  createdAt: Date;
}

export interface UserKeyRecord {
  id: string;
  email: string;
  keyPrefix: string;
  createdAt: Date;
  revokedAt: Date | null;
}

export async function createUserKey(email: string): Promise<CreatedUserKey> {
  const { rawKey, keyHash, keyPrefix } = generateApiKey();
  const database = db();
  const rows = await database.insert(userApiKeys).values({ email, keyHash, keyPrefix }).returning();
  const record = rows[0];
  if (!record) throw new Error('Failed to create user API key');
  return {
    id: record.id,
    email: record.email,
    keyPrefix: record.keyPrefix,
    rawKey,
    createdAt: record.createdAt,
  };
}

export async function listUserKeys(): Promise<UserKeyRecord[]> {
  const database = db();
  const rows = await database.select().from(userApiKeys);
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    keyPrefix: r.keyPrefix,
    createdAt: r.createdAt,
    revokedAt: r.revokedAt ?? null,
  }));
}

export async function revokeByEmail(email: string): Promise<number> {
  const database = db();
  const result = await database
    .update(userApiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(userApiKeys.email, email), isNull(userApiKeys.revokedAt)));
  return result.length;
}

export async function validateUserKey(rawKey: string): Promise<{ email: string } | null> {
  const database = db();
  const keyHash = hashApiKey(rawKey);
  const [found] = await database
    .select()
    .from(userApiKeys)
    .where(eq(userApiKeys.keyHash, keyHash))
    .limit(1);

  if (!found || found.revokedAt !== null) return null;
  if (!verifyApiKey(rawKey, found.keyHash)) return null;
  return { email: found.email };
}
