import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { Db } from './connection.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export async function runMigrations(db: Db): Promise<void> {
  migrate(db, { migrationsFolder: join(__dirname, 'migrations') });
}
