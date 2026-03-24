import { describe, expect, it, vi } from 'vitest';
import { listAuditLogCommand } from '../list_audit_log.js';

function createMockDb(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue(rows),
  };
  return { select: vi.fn().mockReturnValue(chain), _chain: chain };
}

describe('listAuditLogCommand', () => {
  it('returns audit log entries for an environment', async () => {
    const entries = [
      { id: '1', environmentId: 'env-1', flagId: 'f-1', action: 'created', actor: 'a@b.com' },
      { id: '2', environmentId: 'env-1', flagId: 'f-1', action: 'updated', actor: 'a@b.com' },
    ];
    const db = createMockDb(entries);

    const result = await listAuditLogCommand({
      dependencies: { db: db as never },
      params: { environmentId: 'env-1', limit: 50, offset: 0 },
    });

    expect(result).toEqual(entries);
    expect(db.select).toHaveBeenCalled();
  });

  it('applies limit and offset', async () => {
    const db = createMockDb([]);

    await listAuditLogCommand({
      dependencies: { db: db as never },
      params: { environmentId: 'env-1', limit: 10, offset: 20 },
    });

    expect(db._chain.limit).toHaveBeenCalledWith(10);
    expect(db._chain.offset).toHaveBeenCalledWith(20);
  });
});
