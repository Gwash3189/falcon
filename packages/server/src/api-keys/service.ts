import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "../db/connection.js";
import { type ApiKey, apiKeys } from "../db/schema/index.js";
import { generateApiKey } from "./hash.js";

export interface CreatedApiKey {
  apiKey: ApiKey;
  rawKey: string;
}

export async function listApiKeys(
  db: Db,
  environmentId: string,
): Promise<ApiKey[]> {
  return db
    .select()
    .from(apiKeys)
    .where(
      and(eq(apiKeys.environmentId, environmentId), isNull(apiKeys.revokedAt)),
    )
    .orderBy(apiKeys.createdAt);
}

export async function createApiKey(
  db: Db,
  environmentId: string,
): Promise<CreatedApiKey> {
  const { rawKey, keyHash, keyPrefix } = generateApiKey();
  const rows = await db
    .insert(apiKeys)
    .values({ environmentId, keyHash, keyPrefix })
    .returning();
  const apiKey = rows[0];
  if (!apiKey) throw new Error("Insert did not return a row");
  return { apiKey, rawKey };
}

export async function revokeApiKey(
  db: Db,
  id: string,
  environmentId: string,
): Promise<boolean> {
  const result = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(apiKeys.id, id),
        eq(apiKeys.environmentId, environmentId),
        isNull(apiKeys.revokedAt),
      ),
    )
    .returning({ id: apiKeys.id });
  return result.length > 0;
}
