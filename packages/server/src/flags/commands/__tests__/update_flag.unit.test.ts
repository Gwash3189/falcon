import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateFlagCommand } from '../update_flag.js';

describe('updateFlagCommand', () => {
  describe('when the flag exists', () => {
    let mockDb: any;
    let mockQueue: any;
    const existing = { id: 'flag-1', environmentId: 'env-1', key: 'my-flag', enabled: false };
    const updated = { id: 'flag-1', environmentId: 'env-1', key: 'my-flag', enabled: true };

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.select = vi.fn().mockReturnValue(mockDb);
      mockDb.from = vi.fn().mockReturnValue(mockDb);
      mockDb.where = vi.fn().mockReturnValue(mockDb);
      mockDb.limit = vi.fn().mockReturnValue([existing]);
      mockDb.update = vi.fn().mockReturnValue(mockDb);
      mockDb.set = vi.fn().mockReturnValue(mockDb);
      mockDb.returning = vi.fn().mockReturnValue([updated]);
      mockQueue = { add: vi.fn().mockResolvedValue(undefined) };
    });

    it('returns the updated flag', async () => {
      const result = await updateFlagCommand({
        dependencies: { db: mockDb, queue: mockQueue },
        params: { environmentId: 'env-1', key: 'my-flag', data: { enabled: true }, actor: null },
      });
      expect(result).toEqual(updated);
    });

    it('adds an audit log entry', async () => {
      await updateFlagCommand({
        dependencies: { db: mockDb, queue: mockQueue },
        params: {
          environmentId: 'env-1',
          key: 'my-flag',
          data: { enabled: true },
          actor: 'user-1',
        },
      });
      expect(mockQueue.add).toHaveBeenCalledWith(
        'audit-log',
        expect.objectContaining({ action: 'updated', actor: 'user-1' }),
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

    it('returns null', async () => {
      const result = await updateFlagCommand({
        dependencies: { db: mockDb, queue: mockQueue },
        params: {
          environmentId: 'env-1',
          key: 'does-not-exist',
          data: { enabled: true },
          actor: null,
        },
      });
      expect(result).toBeNull();
    });
  });
});
