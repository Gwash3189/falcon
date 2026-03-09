import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictError } from '../../../errors.js';
import { createProjectCommand } from '../create_project.js';

vi.mock('../../../db/errors.js', () => ({
  isUniqueViolation: vi.fn((err: unknown) => (err as { code?: string }).code === '23505'),
}));

describe('createProjectCommand', () => {
  describe('when the insert succeeds', () => {
    let mockDb: any;
    const project = { id: 'abc-123', name: 'My Project', slug: 'my-project' };

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.insert = vi.fn().mockReturnValue(mockDb);
      mockDb.values = vi.fn().mockReturnValue(mockDb);
      mockDb.returning = vi.fn().mockReturnValue([project]);
    });

    it('returns the created project', async () => {
      const result = await createProjectCommand({
        dependencies: { db: mockDb },
        params: { name: 'My Project', slug: 'my-project' },
      });
      expect(result).toEqual(project);
    });
  });

  describe('when a unique violation occurs', () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.insert = vi.fn().mockReturnValue(mockDb);
      mockDb.values = vi.fn().mockReturnValue(mockDb);
      mockDb.returning = vi.fn().mockRejectedValue({ code: '23505' });
    });

    it('throws a ConflictError', async () => {
      await expect(
        createProjectCommand({
          dependencies: { db: mockDb },
          params: { name: 'My Project', slug: 'my-project' },
        }),
      ).rejects.toThrow(ConflictError);
    });
  });
});
