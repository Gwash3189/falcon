import { Redis } from 'iovalkey';
import { createApp } from './app.js';
import { config } from './config.js';
import { createDb } from './db/connection.js';
import { createAuditQueue } from './queue/client.js';
import { createAuditWorker } from './queue/worker.js';

export function createServer() {
  const { DATABASE_URL, VALKEY_URL } = config();
  const db = createDb(DATABASE_URL);
  const redis = new Redis(VALKEY_URL);
  const queue = createAuditQueue(VALKEY_URL);
  const worker = createAuditWorker(VALKEY_URL, db);
  const app = createApp({ db, redis, queue });
  return { app, config: config(), db, redis, queue, worker };
}
