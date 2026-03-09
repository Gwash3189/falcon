import { config } from '../config.js';
import { createDb } from '../db/connection.js';
import type { NewFlag } from '../db/schema/index.js';
import { type AuditQueue, createAuditQueue } from '../queue/client.js';
import { createFlagCommand } from './commands/create_flag.js';
import { deleteFlagCommand } from './commands/delete_flag.js';
import { getFlagByKeyCommand } from './commands/get_flag_by_key.js';
import { listFlagsCommand } from './commands/list_flags.js';
import { updateFlagCommand } from './commands/update_flag.js';

let _queue: AuditQueue | undefined;
function getQueue(): AuditQueue {
  if (!_queue) _queue = createAuditQueue(config().VALKEY_URL);
  return _queue;
}

export async function listFlags(environmentId: string) {
  return listFlagsCommand({
    dependencies: { db: createDb() },
    params: { environmentId },
  });
}

export async function getFlagByKey(environmentId: string, key: string) {
  return getFlagByKeyCommand({
    dependencies: { db: createDb() },
    params: { environmentId, key },
  });
}

export async function createFlag(
  environmentId: string,
  data: Pick<NewFlag, 'key' | 'type' | 'enabled' | 'percentage' | 'identifiers'>,
  actor: string | null = null,
) {
  return createFlagCommand({
    dependencies: { db: createDb(), queue: getQueue() },
    params: { environmentId, data, actor },
  });
}

export async function updateFlag(
  environmentId: string,
  key: string,
  data: Partial<Pick<NewFlag, 'enabled' | 'percentage' | 'identifiers'>>,
  actor: string | null = null,
) {
  return updateFlagCommand({
    dependencies: { db: createDb(), queue: getQueue() },
    params: { environmentId, key, data, actor },
  });
}

export async function deleteFlag(environmentId: string, key: string, actor: string | null = null) {
  return deleteFlagCommand({
    dependencies: { db: createDb(), queue: getQueue() },
    params: { environmentId, key, actor },
  });
}
