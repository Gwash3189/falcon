import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { Db } from '../../db/connection.js';
import { apiKeyAuth } from '../auth.js';
import { generateApiKey } from '../hash.js';

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

describe('apiKeyAuth', () => {
  describe('when no Authorization header is provided', () => {
    it('returns 401 with UNAUTHORIZED code', async () => {
      const app = buildApp(undefined);
      const res = await app.request('/protected');
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('when the header format is not "Bearer <token>"', () => {
    it('returns 401', async () => {
      const app = buildApp(undefined);
      const res = await app.request('/protected', {
        headers: { Authorization: 'Basic sometoken' },
      });
      expect(res.status).toBe(401);
    });
  });

  describe('when the key is not found in the database', () => {
    it('returns 401 with UNAUTHORIZED code', async () => {
      const app = buildApp(undefined);
      const { rawKey } = generateApiKey();
      const res = await app.request('/protected', {
        headers: { Authorization: `Bearer ${rawKey}` },
      });
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('when the key has been revoked', () => {
    it('returns 401', async () => {
      const { rawKey, keyPrefix } = generateApiKey();
      const app = buildApp({
        environmentId: 'env-id',
        keyPrefix,
        revokedAt: new Date(),
      });
      const res = await app.request('/protected', {
        headers: { Authorization: `Bearer ${rawKey}` },
      });
      expect(res.status).toBe(401);
    });
  });

  describe('when the key is valid', () => {
    it('calls next and attaches environmentId and keyPrefix to context', async () => {
      const { rawKey, keyPrefix } = generateApiKey();
      const environmentId = 'env-abc';
      const app = buildApp({ environmentId, keyPrefix, revokedAt: null });
      const res = await app.request('/protected', {
        headers: { Authorization: `Bearer ${rawKey}` },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        auth: { environmentId: string; keyPrefix: string };
      };
      expect(body.auth.environmentId).toBe(environmentId);
      expect(body.auth.keyPrefix).toBe(keyPrefix);
    });
  });
});
