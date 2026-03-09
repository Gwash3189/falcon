import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listEnvironmentsCommand } from '../list_environments.js';

describe('listEnvironmentsCommand', () => {
  describe('when there are environments for the project', () => {
    let mockDb: any;
    const envs = [{ id: 'env-1', projectId: 'proj-1', name: 'Production', slug: 'production' }];

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.select = vi.fn().mockReturnValue(mockDb);
      mockDb.from = vi.fn().mockReturnValue(mockDb);
      mockDb.where = vi.fn().mockReturnValue(mockDb);
      mockDb.orderBy = vi.fn().mockReturnValue(envs);
    });

    it('returns the list of environments', async () => {
      const result = await listEnvironmentsCommand({
        dependencies: { db: mockDb },
        params: { projectId: 'proj-1' },
      });
      expect(result).toEqual(envs);
    });
  });

  describe('when there are no environments', () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.select = vi.fn().mockReturnValue(mockDb);
      mockDb.from = vi.fn().mockReturnValue(mockDb);
      mockDb.where = vi.fn().mockReturnValue(mockDb);
      mockDb.orderBy = vi.fn().mockReturnValue([]);
    });

    it('returns an empty array', async () => {
      const result = await listEnvironmentsCommand({
        dependencies: { db: mockDb },
        params: { projectId: 'proj-1' },
      });
      expect(result).toEqual([]);
    });
  });
});
