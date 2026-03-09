import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteProjectCommand } from '../delete_project.js';

describe('deleteProjectCommand', () => {
  describe('when the project exists', () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.delete = vi.fn().mockReturnValue(mockDb);
      mockDb.where = vi.fn().mockReturnValue(mockDb);
      mockDb.returning = vi.fn().mockReturnValue([{ id: 'abc-123' }]);
    });

    it('returns true', async () => {
      const result = await deleteProjectCommand({
        dependencies: { db: mockDb },
        params: { id: 'abc-123' },
      });
      expect(result).toBe(true);
    });
  });

  describe('when the project does not exist', () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.delete = vi.fn().mockReturnValue(mockDb);
      mockDb.where = vi.fn().mockReturnValue(mockDb);
      mockDb.returning = vi.fn().mockReturnValue([]);
    });

    it('returns false', async () => {
      const result = await deleteProjectCommand({
        dependencies: { db: mockDb },
        params: { id: 'does-not-exist' },
      });
      expect(result).toBe(false);
    });
  });
});
