/**
 * Audit log integration tests.
 * Uses a real BullMQ worker + Valkey to verify that flag mutations produce
 * correct audit_log rows in the database.
 */
import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { createDb } from '../db/connection.js';
import { auditLog } from '../db/schema/index.js';
import { createAuditQueue } from '../queue/client.js';
import { createAuditWorker } from '../queue/worker.js';
import { createUserKey } from '../user-keys/service.js';
import { DATABASE_URL, VALKEY_URL } from './config.js';

const testAppConfig = { BOOTSTRAP_ADMIN_KEY: 'test-bootstrap-key' };

/** Wait for a BullMQ job to complete, polling until timeout. */
async function waitForJobCompletion(queue: ReturnType<typeof createAuditQueue>, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const counts = await queue.getJobCounts('active', 'waiting', 'delayed');
    const pending = (counts.active ?? 0) + (counts.waiting ?? 0) + (counts.delayed ?? 0);
    if (pending === 0) return;
    await new Promise((r) => setTimeout(r, 100));
  }
}

describe('Audit log', () => {
  let app: ReturnType<typeof createApp>;
  let db: ReturnType<typeof createDb>;
  let queue: ReturnType<typeof createAuditQueue>;
  let worker: ReturnType<typeof createAuditWorker>;
  let projectId: string;
  let envId: string;
  let userKey: string;
  let userEmail: string;

  beforeAll(async () => {
    db = createDb(DATABASE_URL);
    queue = createAuditQueue(VALKEY_URL);
    worker = createAuditWorker(VALKEY_URL, db);

    app = createApp({ db, redis: { get: async () => null, setex: async () => 'OK' } as never, queue, appConfig: testAppConfig });

    const { rawKey, email } = await createUserKey(`audit-test-${Math.random().toString(36).slice(2)}@example.com`);
    userKey = rawKey;
    userEmail = email;

    const projRes = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userKey}` },
      body: JSON.stringify({ name: uuidv7(), slug: uuidv7() }),
    });
    const projBody = (await projRes.json()) as { data: { id: string } };
    projectId = projBody.data.id;

    const envRes = await app.request(`/api/projects/${projectId}/environments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userKey}` },
      body: JSON.stringify({ name: uuidv7(), slug: uuidv7() }),
    });
    const envBody = (await envRes.json()) as { data: { id: string } };
    envId = envBody.data.id;
  });

  afterAll(async () => {
    await app.request(`/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userKey}` },
    });
    await worker.close();
    await queue.close();
  });

  function flagUrl(key?: string) {
    const base = `/api/projects/${projectId}/environments/${envId}/flags`;
    return key ? `${base}/${key}` : base;
  }

  function authHeaders() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${userKey}` };
  }

  it('records a "created" audit entry with actor when a flag is created', async () => {
    const key = uuidv7();
    const res = await app.request(flagUrl(), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ key, type: 'boolean', enabled: false }),
    });
    expect(res.status).toBe(201);
    const { data: flag } = (await res.json()) as { data: { id: string } };

    await waitForJobCompletion(queue);

    const entries = await db.select().from(auditLog).where(eq(auditLog.flagId, flag.id));
    expect(entries.length).toBe(1);
    const entry = entries[0];
    expect(entry?.action).toBe('created');
    expect(entry?.actor).toBe(userEmail);
    expect(entry?.beforeState).toBeNull();
    expect(entry?.afterState).not.toBeNull();
  });

  it('records an "updated" audit entry with before and after state', async () => {
    const key = uuidv7();
    const createRes = await app.request(flagUrl(), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ key, type: 'boolean', enabled: false }),
    });
    const { data: flag } = (await createRes.json()) as { data: { id: string } };

    await app.request(flagUrl(key), {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ enabled: true }),
    });

    await waitForJobCompletion(queue);

    const entries = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.flagId, flag.id));
    const updated = entries.find((e) => e.action === 'updated');
    expect(updated).toBeDefined();
    expect(updated?.actor).toBe(userEmail);
    expect(updated?.beforeState).not.toBeNull();
    expect(updated?.afterState).not.toBeNull();
  });

  it('records a "deleted" audit entry after flag deletion', async () => {
    const key = uuidv7();
    const createRes = await app.request(flagUrl(), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ key, type: 'boolean', enabled: false }),
    });
    const { data: flag } = (await createRes.json()) as { data: { id: string } };

    await app.request(flagUrl(key), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userKey}` },
    });

    await waitForJobCompletion(queue);

    const entries = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.flagId, flag.id));
    const deleted = entries.find((e) => e.action === 'deleted');
    expect(deleted).toBeDefined();
    expect(deleted?.actor).toBe(userEmail);
    expect(deleted?.afterState).toBeNull();
    expect(deleted?.beforeState).not.toBeNull();
  });
});
