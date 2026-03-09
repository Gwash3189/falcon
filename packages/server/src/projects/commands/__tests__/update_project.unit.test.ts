import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictError } from '../../../errors.js';
import { updateProjectCommand } from '../update_project.js';

vi.mock('../../../db/errors.js', () => ({
  isUniqueViolation: vi.fn((err: unknown) => (err as { code?: string }).code === '23505'),
}));

describe('updateProjectCommand', () => {
  describe('when the project exists', () => {
    let mockDb: any;
    const updated = { id: 'abc-123', name: 'Renamed', slug: 'renamed' };

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.update = vi.fn().mockReturnValue(mockDb);
      mockDb.set = vi.fn().mockReturnValue(mockDb);
      mockDb.where = vi.fn().mockReturnValue(mockDb);
      mockDb.returning = vi.fn().mockReturnValue([updated]);
    });

    it('returns the updated project', async () => {
      const result = await updateProjectCommand({
        dependencies: { db: mockDb },
        params: { id: 'abc-123', data: { name: 'Renamed', slug: 'renamed' } },
      });
      expect(result).toEqual(updated);
    });
  });

  describe('when the project does not exist', () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.update = vi.fn().mockReturnValue(mockDb);
      mockDb.set = vi.fn().mockReturnValue(mockDb);
      mockDb.where = vi.fn().mockReturnValue(mockDb);
      mockDb.returning = vi.fn().mockReturnValue([]);
    });

    it('returns null', async () => {
      const result = await updateProjectCommand({
        dependencies: { db: mockDb },
        params: { id: 'does-not-exist', data: { name: 'Renamed' } },
      });
      expect(result).toBeNull();
    });
  });

  describe('when a unique violation occurs', () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.update = vi.fn().mockReturnValue(mockDb);
      mockDb.set = vi.fn().mockReturnValue(mockDb);
      mockDb.where = vi.fn().mockReturnValue(mockDb);
      mockDb.returning = vi.fn().mockRejectedValue({ code: '23505' });
    });

    it('throws a ConflictError', async () => {
      await expect(
        updateProjectCommand({
          dependencies: { db: mockDb },
          params: { id: 'abc-123', data: { slug: 'taken' } },
        }),
      ).rejects.toThrow(ConflictError);
    });
  });
});
