import { describe, it, expect } from 'vitest';
import { createApp } from '../app.js';
import { createDb } from '../db/connection.js';

describe('GET /health', () => {
  it('returns 200 when database is reachable', async () => {
    const db = createDb(process.env['DATABASE_URL'] ?? 'postgresql://falcon:falcon@localhost:5432/falcon_dev');
    const app = createApp({ db });
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json() as { status: string; timestamp: string };
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
  });

  it('returns 503 when database is unreachable', async () => {
    const db = createDb('postgresql://bad:bad@localhost:9999/nonexistent');
    const app = createApp({ db });
    const res = await app.request('/health');
    expect(res.status).toBe(503);
    const body = await res.json() as { status: string };
    expect(body.status).toBe('unavailable');
  });
});
