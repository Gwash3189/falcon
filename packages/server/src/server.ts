import { Redis } from 'iovalkey';
import { createApp } from './app.js';
import { config } from './config.js';
import { createDb } from './db/connection.js';
import { createAuditQueue } from './queue/client.js';
import { createAuditWorker } from './queue/worker.js';

export function createServer() {
  const appConfig = config();
  const { DATABASE_URL, VALKEY_URL } = appConfig;
  const db = createDb(DATABASE_URL);
  const redis = new Redis(VALKEY_URL);
  const queue = createAuditQueue(VALKEY_URL);
  const worker = createAuditWorker(VALKEY_URL, db);
  const app = createApp({ db, redis, queue, appConfig });
  return { app, config: appConfig, db, redis, queue, worker };
}
