import { serve } from '@hono/node-server';
import { createServer } from './server.js';

const { app, config, db, redis, queue, worker } = createServer();

worker.on('failed', (job, err) => {
  console.error(`audit-log job ${job?.id} failed:`, err.message);
});

const server = serve({ fetch: app.fetch, port: config.PORT }, () => {
  console.log(`falcon server listening on :${config.PORT}`);
});

async function shutdown() {
  console.log('Shutting down...');
  server.close();
  await worker.close();
  await queue.close();
  await redis.quit();
  db.$client.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
