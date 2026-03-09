import { command } from '@falcon/shared';
import { and, eq, isNull } from 'drizzle-orm';
import type { Db } from '../../db/connection.js';
import { type ApiKey, apiKeys } from '../../db/schema/index.js';

export type Dependencies = { db: Db };
export type Params = { environmentId: string };

export const listApiKeysCommand = command<Dependencies, Params, Promise<ApiKey[]>>(
  async ({ dependencies, params }) => {
    const { db } = dependencies;
    const { environmentId } = params;
    return db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.environmentId, environmentId), isNull(apiKeys.revokedAt)))
      .orderBy(apiKeys.createdAt);
  },
);
