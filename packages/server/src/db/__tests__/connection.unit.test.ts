import { describe, expect, it } from 'vitest';
import { createDb } from '../connection.js';
import { checkDatabase } from '../health.js';

describe('checkDatabase', () => {
  describe('when the database is reachable', () => {
    it('returns true', async () => {
      const db = createDb(':memory:');
      const result = await checkDatabase(db);
      expect(result).toBe(true);
    });
  });
});
