import { createDb } from '../db/connection.js';
import { listAuditLogCommand } from './commands/list_audit_log.js';

export async function listAuditLog(
  environmentId: string,
  options: {
    flagId?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  } = {},
) {
  const params: {
    environmentId: string;
    flagId?: string | undefined;
    limit: number;
    offset: number;
  } = {
    environmentId,
    limit: options.limit ?? 50,
    offset: options.offset ?? 0,
  };
  if (options.flagId !== undefined) {
    params.flagId = options.flagId;
  }
  return listAuditLogCommand({
    dependencies: { db: createDb() },
    params,
  });
}
