import { describe, expect, it } from 'vitest';
import { INTEGRATION } from '../../__tests__/helpers/app.js';
import { createDb } from '../connection.js';
import { checkDatabase } from '../health.js';

describe('checkDatabase', () => {
  it.skipIf(!INTEGRATION)('returns true when database is reachable', async () => {
    const db = createDb(process.env.DATABASE_URL!);
    const result = await checkDatabase(db);
    expect(result).toBe(true);
  });

  it('returns false when given invalid connection string', async () => {
    const db = createDb('postgresql://invalid:invalid@localhost:1/nonexistent');
    const result = await checkDatabase(db);
    expect(result).toBe(false);
  });
});
