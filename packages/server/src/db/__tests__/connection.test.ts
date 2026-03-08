import { describe, expect, it } from 'vitest';
import { createDb } from '../connection.js';
import { checkDatabase } from '../health.js';

describe('checkDatabase', () => {
  it('returns true when database is reachable', async () => {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL environment variable is required for this test');
    }
    const db = createDb(url);
    const result = await checkDatabase(db);
    expect(result).toBe(true);
  });

  it('returns false when given invalid connection string', async () => {
    const db = createDb('postgresql://invalid:invalid@localhost:1/nonexistent');
    const result = await checkDatabase(db);
    expect(result).toBe(false);
  });
});
