import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictError } from '../../../errors.js';
import { updateEnvironmentCommand } from '../update_environment.js';

vi.mock('../../../db/errors.js', () => ({
  isUniqueViolation: vi.fn((err: unknown) => (err as { code?: string }).code === '23505'),
}));

describe('updateEnvironmentCommand', () => {
  describe('when the environment exists', () => {
    let mockDb: any;
    const updated = { id: 'env-1', projectId: 'proj-1', name: 'Staging', slug: 'staging' };

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.update = vi.fn().mockReturnValue(mockDb);
      mockDb.set = vi.fn().mockReturnValue(mockDb);
      mockDb.where = vi.fn().mockReturnValue(mockDb);
      mockDb.returning = vi.fn().mockReturnValue([updated]);
    });

    it('returns the updated environment', async () => {
      const result = await updateEnvironmentCommand({
        dependencies: { db: mockDb },
        params: { id: 'env-1', projectId: 'proj-1', data: { name: 'Staging', slug: 'staging' } },
      });
      expect(result).toEqual(updated);
    });
  });

  describe('when the environment does not exist', () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.update = vi.fn().mockReturnValue(mockDb);
      mockDb.set = vi.fn().mockReturnValue(mockDb);
      mockDb.where = vi.fn().mockReturnValue(mockDb);
      mockDb.returning = vi.fn().mockReturnValue([]);
    });

    it('returns null', async () => {
      const result = await updateEnvironmentCommand({
        dependencies: { db: mockDb },
        params: { id: 'does-not-exist', projectId: 'proj-1', data: { name: 'Staging' } },
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
        updateEnvironmentCommand({
          dependencies: { db: mockDb },
          params: { id: 'env-1', projectId: 'proj-1', data: { slug: 'taken' } },
        }),
      ).rejects.toThrow(ConflictError);
    });
  });
});
