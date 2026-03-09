import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listFlagsCommand } from '../list_flags.js';

describe('listFlagsCommand', () => {
  describe('when there are flags for the environment', () => {
    let mockDb: any;
    const flagList = [{ id: 'flag-1', environmentId: 'env-1', key: 'my-flag' }];

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.select = vi.fn().mockReturnValue(mockDb);
      mockDb.from = vi.fn().mockReturnValue(mockDb);
      mockDb.where = vi.fn().mockReturnValue(mockDb);
      mockDb.orderBy = vi.fn().mockReturnValue(flagList);
    });

    it('returns the list of flags', async () => {
      const result = await listFlagsCommand({
        dependencies: { db: mockDb },
        params: { environmentId: 'env-1' },
      });
      expect(result).toEqual(flagList);
    });
  });

  describe('when there are no flags', () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.select = vi.fn().mockReturnValue(mockDb);
      mockDb.from = vi.fn().mockReturnValue(mockDb);
      mockDb.where = vi.fn().mockReturnValue(mockDb);
      mockDb.orderBy = vi.fn().mockReturnValue([]);
    });

    it('returns an empty array', async () => {
      const result = await listFlagsCommand({
        dependencies: { db: mockDb },
        params: { environmentId: 'env-1' },
      });
      expect(result).toEqual([]);
    });
  });
});
