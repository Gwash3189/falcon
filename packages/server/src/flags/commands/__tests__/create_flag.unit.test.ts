import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictError } from '../../../errors.js';
import { createFlagCommand } from '../create_flag.js';

vi.mock('../../../db/errors.js', () => ({
  isUniqueViolation: vi.fn((err: unknown) => (err as { code?: string }).code === '23505'),
}));

describe('createFlagCommand', () => {
  describe('when the insert succeeds', () => {
    let mockDb: any;
    let mockQueue: any;
    const flag = {
      id: 'flag-1',
      environmentId: 'env-1',
      key: 'my-flag',
      type: 'boolean',
      enabled: false,
    };

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.insert = vi.fn().mockReturnValue(mockDb);
      mockDb.values = vi.fn().mockReturnValue(mockDb);
      mockDb.returning = vi.fn().mockReturnValue([flag]);
      mockQueue = { add: vi.fn().mockResolvedValue(undefined) };
    });

    it('returns the created flag', async () => {
      const result = await createFlagCommand({
        dependencies: { db: mockDb, queue: mockQueue },
        params: {
          environmentId: 'env-1',
          data: {
            key: 'my-flag',
            type: 'boolean',
            enabled: false,
            percentage: undefined,
            identifiers: undefined,
          },
          actor: null,
        },
      });
      expect(result).toEqual(flag);
    });

    it('adds an audit log entry', async () => {
      await createFlagCommand({
        dependencies: { db: mockDb, queue: mockQueue },
        params: {
          environmentId: 'env-1',
          data: {
            key: 'my-flag',
            type: 'boolean',
            enabled: false,
            percentage: undefined,
            identifiers: undefined,
          },
          actor: 'user-1',
        },
      });
      expect(mockQueue.add).toHaveBeenCalledWith(
        'audit-log',
        expect.objectContaining({ action: 'created', actor: 'user-1' }),
      );
    });
  });

  describe('when a unique violation occurs', () => {
    let mockDb: any;
    let mockQueue: any;

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.insert = vi.fn().mockReturnValue(mockDb);
      mockDb.values = vi.fn().mockReturnValue(mockDb);
      mockDb.returning = vi.fn().mockRejectedValue({ code: '23505' });
      mockQueue = { add: vi.fn().mockResolvedValue(undefined) };
    });

    it('throws a ConflictError', async () => {
      await expect(
        createFlagCommand({
          dependencies: { db: mockDb, queue: mockQueue },
          params: {
            environmentId: 'env-1',
            data: {
              key: 'my-flag',
              type: 'boolean',
              enabled: false,
              percentage: undefined,
              identifiers: undefined,
            },
            actor: null,
          },
        }),
      ).rejects.toThrow(ConflictError);
    });
  });
});
