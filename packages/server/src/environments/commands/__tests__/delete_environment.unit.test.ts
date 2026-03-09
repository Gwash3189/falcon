import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteEnvironmentCommand } from '../delete_environment.js';

describe('deleteEnvironmentCommand', () => {
  describe('when the environment exists', () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.delete = vi.fn().mockReturnValue(mockDb);
      mockDb.where = vi.fn().mockReturnValue(mockDb);
      mockDb.returning = vi.fn().mockReturnValue([{ id: 'env-1' }]);
    });

    it('returns true', async () => {
      const result = await deleteEnvironmentCommand({
        dependencies: { db: mockDb },
        params: { id: 'env-1', projectId: 'proj-1' },
      });
      expect(result).toBe(true);
    });
  });

  describe('when the environment does not exist', () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.delete = vi.fn().mockReturnValue(mockDb);
      mockDb.where = vi.fn().mockReturnValue(mockDb);
      mockDb.returning = vi.fn().mockReturnValue([]);
    });

    it('returns false', async () => {
      const result = await deleteEnvironmentCommand({
        dependencies: { db: mockDb },
        params: { id: 'does-not-exist', projectId: 'proj-1' },
      });
      expect(result).toBe(false);
    });
  });
});
