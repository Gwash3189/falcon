import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getFlagByKeyCommand } from '../get_flag_by_key.js';

describe('getFlagByKeyCommand', () => {
  describe('when the flag exists', () => {
    let mockDb: any;
    const flag = { id: 'flag-1', environmentId: 'env-1', key: 'my-flag', type: 'boolean' };

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.select = vi.fn().mockReturnValue(mockDb);
      mockDb.from = vi.fn().mockReturnValue(mockDb);
      mockDb.where = vi.fn().mockReturnValue(mockDb);
      mockDb.limit = vi.fn().mockReturnValue([flag]);
    });

    it('returns the flag', async () => {
      const result = await getFlagByKeyCommand({
        dependencies: { db: mockDb },
        params: { environmentId: 'env-1', key: 'my-flag' },
      });
      expect(result).toEqual(flag);
    });
  });

  describe('when the flag does not exist', () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.select = vi.fn().mockReturnValue(mockDb);
      mockDb.from = vi.fn().mockReturnValue(mockDb);
      mockDb.where = vi.fn().mockReturnValue(mockDb);
      mockDb.limit = vi.fn().mockReturnValue([]);
    });

    it('returns null', async () => {
      const result = await getFlagByKeyCommand({
        dependencies: { db: mockDb },
        params: { environmentId: 'env-1', key: 'does-not-exist' },
      });
      expect(result).toBeNull();
    });
  });
});
