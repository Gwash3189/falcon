import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictError } from '../../../errors.js';
import { createEnvironmentCommand } from '../create_environment.js';

vi.mock('../../../db/errors.js', () => ({
  isUniqueViolation: vi.fn((err: unknown) => (err as { code?: string }).code === '23505'),
}));

describe('createEnvironmentCommand', () => {
  describe('when the insert succeeds', () => {
    let mockDb: any;
    const env = { id: 'env-1', projectId: 'proj-1', name: 'Production', slug: 'production' };

    beforeEach(() => {
      mockDb = {} as any;
      mockDb.insert = vi.fn().mockReturnValue(mockDb);
      mockDb.values = vi.fn().mockReturnValue(mockDb);
      mockDb.returning = vi.fn().mockReturnValue([env]);
    });

    it('returns the created environment', async () => {
      const result = await createEnvironmentCommand({
        dependencies: { db: mockDb },
        params: { projectId: 'proj-1', name: 'Production', slug: 'production' },
      });
      expect(result).toEqual(env);
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
        createEnvironmentCommand({
          dependencies: { db: mockDb },
          params: { projectId: 'proj-1', name: 'Production', slug: 'production' },
        }),
      ).rejects.toThrow(ConflictError);
    });
  });
});
