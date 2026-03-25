import { sql } from 'drizzle-orm';
import type { Db } from './connection.js';

export async function checkDatabase(db: Db): Promise<boolean> {
  try {
    db.run(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}
