import { command } from '@falcon/shared';
import type { Db } from '../../db/connection.js';
import type { ApiKey } from '../../db/schema/index.js';
import { apiKeys } from '../../db/schema/index.js';
import { generateApiKey } from '../hash.js';

export interface CreatedApiKey {
  apiKey: ApiKey;
  rawKey: string;
}

export type Dependencies = { db: Db };
export type Params = { environmentId: string };

export const createApiKeyCommand = command<Dependencies, Params, Promise<CreatedApiKey>>(
  async ({ dependencies, params }) => {
    const { db } = dependencies;
    const { environmentId } = params;
    const { rawKey, keyHash, keyPrefix } = generateApiKey();
    const rows = await db.insert(apiKeys).values({ environmentId, keyHash, keyPrefix }).returning();
    const apiKey = rows[0];
    if (!apiKey) throw new Error('Insert did not return a row');
    return { apiKey, rawKey };
  },
);
