export interface AuditLogJobData {
  flagId: string;
  environmentId: string;
  action: 'created' | 'updated' | 'deleted';
  actor: string | null;
  beforeState: unknown | null;
  afterState: unknown | null;
}

export const AUDIT_LOG_QUEUE = 'audit-log';
