import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listApiKeysCommand } from '../list_api_keys.js';

describe('listApiKeysCommand', () => {
  describe('when there are API keys for the environment', () => {
    let mockDb: any;
    const keys = [{ id: 'key-1', environmentId: 'env-1' }];

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.select = vi.fn().mockReturnValue(mockDb);
      mockDb.from = vi.fn().mockReturnValue(mockDb);
      mockDb.where = vi.fn().mockReturnValue(mockDb);
      mockDb.orderBy = vi.fn().mockReturnValue(keys);
    });

    it('returns the list of API keys', async () => {
      const result = await listApiKeysCommand({
        dependencies: { db: mockDb },
        params: { environmentId: 'env-1' },
      });
      expect(result).toEqual(keys);
    });
  });

  describe('when there are no API keys', () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.select = vi.fn().mockReturnValue(mockDb);
      mockDb.from = vi.fn().mockReturnValue(mockDb);
      mockDb.where = vi.fn().mockReturnValue(mockDb);
      mockDb.orderBy = vi.fn().mockReturnValue([]);
    });

    it('returns an empty array', async () => {
      const result = await listApiKeysCommand({
        dependencies: { db: mockDb },
        params: { environmentId: 'env-1' },
      });
      expect(result).toEqual([]);
    });
  });
});
