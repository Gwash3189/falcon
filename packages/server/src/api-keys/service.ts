import { createDb } from '../db/connection.js';
import { createApiKeyCommand } from './commands/create_api_key.js';
import { listApiKeysCommand } from './commands/list_api_keys.js';
import { revokeApiKeyCommand } from './commands/revoke_api_key.js';

export type { CreatedApiKey } from './commands/create_api_key.js';

export async function listApiKeys(environmentId: string) {
  return listApiKeysCommand({
    dependencies: { db: createDb() },
    params: { environmentId },
  });
}

export async function createApiKey(environmentId: string) {
  return createApiKeyCommand({
    dependencies: { db: createDb() },
    params: { environmentId },
  });
}

export async function revokeApiKey(id: string, environmentId: string) {
  return revokeApiKeyCommand({
    dependencies: { db: createDb() },
    params: { id, environmentId },
  });
}
