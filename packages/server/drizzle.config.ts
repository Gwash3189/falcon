import type { Config } from 'drizzle-kit';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  // .env not present — rely on env vars already being set (e.g. in CI)
}

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? './data/flagline.db',
  },
} satisfies Config;
