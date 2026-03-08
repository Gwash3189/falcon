import { serve } from '@hono/node-server';
import { parseEnv } from '@falcon/shared';
import { createDb } from './db/connection.js';
import { createApp } from './app.js';

const config = parseEnv();
const db = createDb(config.DATABASE_URL);
const app = createApp({ db });

serve({ fetch: app.fetch, port: config.PORT }, () => {
  console.log(`falcon server listening on :${config.PORT}`);
});
