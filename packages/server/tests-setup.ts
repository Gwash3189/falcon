import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../../.env'), quiet: true });

// Run migrations on the test database so integration tests have a valid schema.
// SQLite creates the file automatically; we just need to apply the DDL.
if (process.env.DATABASE_PATH) {
  const { createDb } = await import('./src/db/connection.js');
  const { runMigrations } = await import('./src/db/migrate.js');
  const db = createDb(process.env.DATABASE_PATH);
  await runMigrations(db);
}
