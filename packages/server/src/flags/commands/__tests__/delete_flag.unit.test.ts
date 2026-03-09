import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteFlagCommand } from '../delete_flag.js';

describe('deleteFlagCommand', () => {
  describe('when the flag exists', () => {
    let mockDb: any;
    let mockQueue: any;
    const existing = { id: 'flag-1', environmentId: 'env-1', key: 'my-flag' };

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.select = vi.fn().mockReturnValue(mockDb);
      mockDb.from = vi.fn().mockReturnValue(mockDb);
      mockDb.where = vi.fn().mockReturnValue(mockDb);
      mockDb.limit = vi.fn().mockReturnValue([existing]);
      mockDb.delete = vi.fn().mockReturnValue(mockDb);
      mockQueue = { add: vi.fn().mockResolvedValue(undefined) };
    });

    it('returns true', async () => {
      const result = await deleteFlagCommand({
        dependencies: { db: mockDb, queue: mockQueue },
        params: { environmentId: 'env-1', key: 'my-flag', actor: null },
      });
      expect(result).toBe(true);
    });

    it('adds an audit log entry', async () => {
      await deleteFlagCommand({
        dependencies: { db: mockDb, queue: mockQueue },
        params: { environmentId: 'env-1', key: 'my-flag', actor: 'user-1' },
      });
      expect(mockQueue.add).toHaveBeenCalledWith(
        'audit-log',
        expect.objectContaining({ action: 'deleted', actor: 'user-1' }),
      );
    });
  });

  describe('when the flag does not exist', () => {
    let mockDb: any;
    let mockQueue: any;

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.select = vi.fn().mockReturnValue(mockDb);
      mockDb.from = vi.fn().mockReturnValue(mockDb);
      mockDb.where = vi.fn().mockReturnValue(mockDb);
      mockDb.limit = vi.fn().mockReturnValue([]);
      mockQueue = { add: vi.fn().mockResolvedValue(undefined) };
    });

    it('returns false', async () => {
      const result = await deleteFlagCommand({
        dependencies: { db: mockDb, queue: mockQueue },
        params: { environmentId: 'env-1', key: 'does-not-exist', actor: null },
      });
      expect(result).toBe(false);
    });
  });
});
