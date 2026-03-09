import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listProjectsCommand } from '../list_projects.js';

describe('listProjectsCommand', () => {
  describe('when there are projects in the database', () => {
    let mockDb: any;
    const projects = [{ id: 'abc-123', name: 'My Project', slug: 'my-project' }];

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.select = vi.fn().mockReturnValue(mockDb);
      mockDb.from = vi.fn().mockReturnValue(mockDb);
      mockDb.orderBy = vi.fn().mockReturnValue(projects);
    });

    it('returns a list of projects', async () => {
      const result = await listProjectsCommand({
        dependencies: { db: mockDb },
        params: {},
      });
      expect(result).toEqual(projects);
    });
  });

  describe('when there are no projects in the database', () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.select = vi.fn().mockReturnValue(mockDb);
      mockDb.from = vi.fn().mockReturnValue(mockDb);
      mockDb.orderBy = vi.fn().mockReturnValue([]);
    });

    it('returns an empty list', async () => {
      const result = await listProjectsCommand({
        dependencies: { db: mockDb },
        params: {},
      });
      expect(result).toEqual([]);
    });
  });
});
