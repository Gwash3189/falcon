import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFalconClient } from '../client.js';

const BASE_URL = 'http://localhost:3000';
const API_KEY = 'flk_testkey';

function mockFetch(response: { ok: boolean; body: unknown }) {
  return vi.fn().mockResolvedValue({
    ok: response.ok,
    json: async () => response.body,
  });
}

describe('createFalconClient', () => {
  describe('evaluate', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', undefined);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('returns true when the server says the flag is enabled', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetch({
          ok: true,
          body: { data: { flag_key: 'my-flag', enabled: true } },
        }),
      );

      const client = createFalconClient({ baseUrl: BASE_URL, apiKey: API_KEY });
      const result = await client.evaluate('my-flag');
      expect(result).toBe(true);
    });

    it('returns false when the server says the flag is disabled', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetch({
          ok: true,
          body: { data: { flag_key: 'my-flag', enabled: false } },
        }),
      );

      const client = createFalconClient({ baseUrl: BASE_URL, apiKey: API_KEY });
      expect(await client.evaluate('my-flag')).toBe(false);
    });

    it('returns false when the server responds with an error', async () => {
      vi.stubGlobal('fetch', mockFetch({ ok: false, body: { error: { code: 'NOT_FOUND' } } }));

      const client = createFalconClient({ baseUrl: BASE_URL, apiKey: API_KEY });
      expect(await client.evaluate('unknown-flag')).toBe(false);
    });

    it('sends the Authorization header with the API key', async () => {
      const fetchMock = mockFetch({
        ok: true,
        body: { data: { flag_key: 'my-flag', enabled: true } },
      });
      vi.stubGlobal('fetch', fetchMock);

      const client = createFalconClient({ baseUrl: BASE_URL, apiKey: API_KEY });
      await client.evaluate('my-flag');

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${API_KEY}`);
    });

    it('sends flag_key and identifier in the request body', async () => {
      const fetchMock = mockFetch({
        ok: true,
        body: { data: { flag_key: 'flag', enabled: false } },
      });
      vi.stubGlobal('fetch', fetchMock);

      const client = createFalconClient({ baseUrl: BASE_URL, apiKey: API_KEY });
      await client.evaluate('flag', { identifier: 'user-123' });

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(init.body as string);
      expect(body.flag_key).toBe('flag');
      expect(body.identifier).toBe('user-123');
    });

    it('does not include identifier in body when none is provided', async () => {
      const fetchMock = mockFetch({
        ok: true,
        body: { data: { flag_key: 'flag', enabled: false } },
      });
      vi.stubGlobal('fetch', fetchMock);

      const client = createFalconClient({ baseUrl: BASE_URL, apiKey: API_KEY });
      await client.evaluate('flag');

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(init.body as string);
      expect(body.identifier).toBeUndefined();
    });

    it('uses the cached result on subsequent calls without hitting the network', async () => {
      const fetchMock = mockFetch({
        ok: true,
        body: { data: { flag_key: 'my-flag', enabled: true } },
      });
      vi.stubGlobal('fetch', fetchMock);

      const client = createFalconClient({ baseUrl: BASE_URL, apiKey: API_KEY });
      await client.evaluate('my-flag');
      await client.evaluate('my-flag');

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('hits the network again after clearCache is called', async () => {
      const fetchMock = mockFetch({
        ok: true,
        body: { data: { flag_key: 'my-flag', enabled: true } },
      });
      vi.stubGlobal('fetch', fetchMock);

      const client = createFalconClient({ baseUrl: BASE_URL, apiKey: API_KEY });
      await client.evaluate('my-flag');
      client.clearCache();
      await client.evaluate('my-flag');

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('strips a trailing slash from the base URL', async () => {
      const fetchMock = mockFetch({
        ok: true,
        body: { data: { flag_key: 'f', enabled: false } },
      });
      vi.stubGlobal('fetch', fetchMock);

      const client = createFalconClient({
        baseUrl: 'http://localhost:3000/',
        apiKey: API_KEY,
      });
      await client.evaluate('f');

      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toBe('http://localhost:3000/evaluate');
    });
  });
});
