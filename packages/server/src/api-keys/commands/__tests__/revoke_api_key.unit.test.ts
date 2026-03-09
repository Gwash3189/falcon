import { beforeEach, describe, expect, it, vi } from 'vitest';
import { revokeApiKeyCommand } from '../revoke_api_key.js';

describe('revokeApiKeyCommand', () => {
  describe('when the API key exists and is active', () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.update = vi.fn().mockReturnValue(mockDb);
      mockDb.set = vi.fn().mockReturnValue(mockDb);
      mockDb.where = vi.fn().mockReturnValue(mockDb);
      mockDb.returning = vi.fn().mockReturnValue([{ id: 'key-1' }]);
    });

    it('returns true', async () => {
      const result = await revokeApiKeyCommand({
        dependencies: { db: mockDb },
        params: { id: 'key-1', environmentId: 'env-1' },
      });
      expect(result).toBe(true);
    });
  });

  describe('when the API key does not exist or is already revoked', () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.update = vi.fn().mockReturnValue(mockDb);
      mockDb.set = vi.fn().mockReturnValue(mockDb);
      mockDb.where = vi.fn().mockReturnValue(mockDb);
      mockDb.returning = vi.fn().mockReturnValue([]);
    });

    it('returns false', async () => {
      const result = await revokeApiKeyCommand({
        dependencies: { db: mockDb },
        params: { id: 'does-not-exist', environmentId: 'env-1' },
      });
      expect(result).toBe(false);
    });
  });
});
