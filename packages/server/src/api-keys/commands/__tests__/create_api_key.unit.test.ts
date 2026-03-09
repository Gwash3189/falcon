import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiKeyCommand } from '../create_api_key.js';

describe('createApiKeyCommand', () => {
  describe('when the insert succeeds', () => {
    let mockDb: any;
    const apiKey = {
      id: 'key-1',
      environmentId: 'env-1',
      keyHash: 'hash',
      keyPrefix: 'pre',
    };

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.insert = vi.fn().mockReturnValue(mockDb);
      mockDb.values = vi.fn().mockReturnValue(mockDb);
      mockDb.returning = vi.fn().mockReturnValue([apiKey]);
    });

    it('returns the created API key with the raw key', async () => {
      const result = await createApiKeyCommand({
        dependencies: { db: mockDb },
        params: { environmentId: 'env-1' },
      });
      expect(result.apiKey).toEqual(apiKey);
      expect(typeof result.rawKey).toBe('string');
      expect(result.rawKey.length).toBeGreaterThan(0);
    });
  });
});
