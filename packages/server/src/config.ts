import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as _config } from 'dotenv';
import { z } from 'zod';

const __dirname = dirname(fileURLToPath(import.meta.url));

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  VALKEY_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BOOTSTRAP_ADMIN_KEY: z.string().min(1),
});

export type AppConfig = z.infer<typeof envSchema>;

export function config(): AppConfig {
  const path = join(__dirname, '../../../.env');
  const result = _config({ path, quiet: true });
  const envResult = envSchema.safeParse(result.parsed);
  if (!envResult.success) {
    throw new Error(`Invalid environment variables:\n${envResult.error.message}`);
  }
  return envResult.data;
}
