import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getEnvironmentCommand } from '../get_environment.js';

describe('getEnvironmentCommand', () => {
  describe('when the environment exists', () => {
    let mockDb: any;
    const env = { id: 'env-1', projectId: 'proj-1', name: 'Production', slug: 'production' };

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.select = vi.fn().mockReturnValue(mockDb);
      mockDb.from = vi.fn().mockReturnValue(mockDb);
      mockDb.where = vi.fn().mockReturnValue(mockDb);
      mockDb.limit = vi.fn().mockReturnValue([env]);
    });

    it('returns the environment', async () => {
      const result = await getEnvironmentCommand({
        dependencies: { db: mockDb },
        params: { id: 'env-1', projectId: 'proj-1' },
      });
      expect(result).toEqual(env);
    });
  });

  describe('when the environment does not exist', () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.select = vi.fn().mockReturnValue(mockDb);
      mockDb.from = vi.fn().mockReturnValue(mockDb);
      mockDb.where = vi.fn().mockReturnValue(mockDb);
      mockDb.limit = vi.fn().mockReturnValue([]);
    });

    it('returns null', async () => {
      const result = await getEnvironmentCommand({
        dependencies: { db: mockDb },
        params: { id: 'does-not-exist', projectId: 'proj-1' },
      });
      expect(result).toBeNull();
    });
  });
});
