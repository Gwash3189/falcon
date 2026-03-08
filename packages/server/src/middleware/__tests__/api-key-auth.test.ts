import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { Db } from '../../db/connection.js';
import { generateApiKey, hashApiKey } from '../../lib/api-key.js';
import { apiKeyAuth } from '../api-key-auth.js';

interface StubRow {
  environmentId: string;
  keyPrefix: string;
  revokedAt: Date | null;
}

/**
 * Build a minimal Hono app with the apiKeyAuth middleware protecting one route.
 * We inject a stubbed DB so these tests run without a real database.
 */
function buildApp(stubRow: StubRow | undefined) {
  const stubDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => (stubRow ? [stubRow] : []),
        }),
      }),
    }),
  } as unknown as Db;

  const app = new Hono();
  app.use('/protected', apiKeyAuth(stubDb));
  app.get('/protected', (c) => c.json({ auth: c.get('auth') }));
  return app;
}

describe('apiKeyAuth middleware', () => {
  it('returns 401 when the Authorization header is absent', async () => {
    const app = buildApp(undefined);
    const res = await app.request('/protected');
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when the header does not start with "Bearer "', async () => {
    const app = buildApp(undefined);
    const res = await app.request('/protected', {
      headers: { Authorization: 'Basic sometoken' },
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 when the key is not found in the database', async () => {
    const app = buildApp(undefined);
    const { rawKey } = generateApiKey();
    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${rawKey}` },
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when the key exists but has been revoked', async () => {
    const { rawKey, keyPrefix } = generateApiKey();
    const app = buildApp({ environmentId: 'env-id', keyPrefix, revokedAt: new Date() });
    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${rawKey}` },
    });
    expect(res.status).toBe(401);
  });

  it('calls next and attaches auth context when the key is valid', async () => {
    const { rawKey, keyPrefix } = generateApiKey();
    const environmentId = 'env-abc';
    const app = buildApp({ environmentId, keyPrefix, revokedAt: null });
    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${rawKey}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { auth: { environmentId: string; keyPrefix: string } };
    expect(body.auth.environmentId).toBe(environmentId);
    expect(body.auth.keyPrefix).toBe(keyPrefix);
  });
});

describe('hashApiKey', () => {
  it('is deterministic for the same input', () => {
    const key = 'flk_test_key';
    expect(hashApiKey(key)).toBe(hashApiKey(key));
  });

  it('produces a 64-char hex string', () => {
    expect(hashApiKey('flk_test')).toHaveLength(64);
  });

  it('produces different hashes for different keys', () => {
    expect(hashApiKey('flk_a')).not.toBe(hashApiKey('flk_b'));
  });
});
