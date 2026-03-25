import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Config } from 'drizzle-kit';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

try {
  process.loadEnvFile(resolve(__dirname, '../../.env'));
} catch {
  // .env not present — rely on env vars already being set (e.g. in CI)
}

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
} satisfies Config;
