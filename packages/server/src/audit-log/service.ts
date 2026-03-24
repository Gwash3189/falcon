import { createDb } from '../db/connection.js';
import { listAuditLogCommand } from './commands/list_audit_log.js';

export async function listAuditLog(
  environmentId: string,
  options: { flagId?: string; limit?: number; offset?: number } = {},
) {
  return listAuditLogCommand({
    dependencies: { db: createDb() },
    params: {
      environmentId,
      flagId: options.flagId,
      limit: options.limit ?? 50,
      offset: options.offset ?? 0,
    },
  });
}
