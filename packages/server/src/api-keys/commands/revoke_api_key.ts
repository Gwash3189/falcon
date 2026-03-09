import { command } from '@falcon/shared';
import { and, eq, isNull } from 'drizzle-orm';
import type { Db } from '../../db/connection.js';
import { apiKeys } from '../../db/schema/index.js';

export type Dependencies = { db: Db };
export type Params = { id: string; environmentId: string };

export const revokeApiKeyCommand = command<Dependencies, Params, Promise<boolean>>(
  async ({ dependencies, params }) => {
    const { db } = dependencies;
    const { id, environmentId } = params;
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
  },
);
