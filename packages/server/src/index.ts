import { parseEnv } from '@falcon/shared';
import { serve } from '@hono/node-server';
import { Redis } from 'iovalkey';
import { createApp } from './app.js';
import { createDb } from './db/connection.js';
import { createAuditQueue } from './queue/client.js';
import { createAuditWorker } from './queue/worker.js';

const config = parseEnv();

const db = createDb(config.DATABASE_URL);
const redis = new Redis(config.VALKEY_URL);

// BullMQ gets its own connection via URL
const queue = createAuditQueue(config.VALKEY_URL);
const worker = createAuditWorker(config.VALKEY_URL, db);

worker.on('failed', (job, err) => {
  console.error(`audit-log job ${job?.id} failed:`, err.message);
});

const app = createApp({ db, redis, queue });

serve({ fetch: app.fetch, port: config.PORT }, () => {
  console.log(`falcon server listening on :${config.PORT}`);
});
