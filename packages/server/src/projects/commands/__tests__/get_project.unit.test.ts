import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getProjectCommand } from '../get_project.js';

describe('getProjectCommand', () => {
  describe('when the project exists', () => {
    let mockDb: any;
    const project = { id: 'abc-123', name: 'My Project', slug: 'my-project' };

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.select = vi.fn().mockReturnValue(mockDb);
      mockDb.from = vi.fn().mockReturnValue(mockDb);
      mockDb.where = vi.fn().mockReturnValue(mockDb);
      mockDb.limit = vi.fn().mockReturnValue([project]);
    });

    it('returns the project', async () => {
      const result = await getProjectCommand({
        dependencies: { db: mockDb },
        params: { id: 'abc-123' },
      });
      expect(result).toEqual(project);
    });
  });

  describe('when the project does not exist', () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.select = vi.fn().mockReturnValue(mockDb);
      mockDb.from = vi.fn().mockReturnValue(mockDb);
      mockDb.where = vi.fn().mockReturnValue(mockDb);
      mockDb.limit = vi.fn().mockReturnValue([]);
    });

    it('returns null', async () => {
      const result = await getProjectCommand({
        dependencies: { db: mockDb },
        params: { id: 'does-not-exist' },
      });
      expect(result).toBeNull();
    });
  });
});
