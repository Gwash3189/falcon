import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as _config } from 'dotenv';
import { z } from 'zod';

const __dirname = dirname(fileURLToPath(import.meta.url));

const envSchema = z.object({
  DATABASE_PATH: z.string().min(1).default('./data/flagline.db'),
  VALKEY_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BOOTSTRAP_ADMIN_KEY: z.string().min(1),
});

export type AppConfig = z.infer<typeof envSchema>;

export function config(): AppConfig {
  const path = join(__dirname, '../../../.env');
  _config({ path, quiet: true }); // loads .env vars into process.env; no-op if file missing
  const envResult = envSchema.safeParse(process.env);
  if (!envResult.success) {
    throw new Error(`Invalid environment variables:\n${envResult.error.message}`);
  }
  return envResult.data;
}
