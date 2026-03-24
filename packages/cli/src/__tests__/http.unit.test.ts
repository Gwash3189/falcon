import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiResponseError, apiFetch } from '../http.js';

const mockConfig = { serverUrl: 'http://localhost:3000', apiKey: 'flk_test_key', email: 'test@example.com' };

function makeResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('apiFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the Authorization Bearer header', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200, { data: [] }));
    await apiFetch(mockConfig, '/api/projects');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/projects',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer flk_test_key',
        }),
      }),
    );
  });

  it('sends Content-Type application/json', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(200, { data: { id: '1' } }));
    await apiFetch(mockConfig, '/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'test' }),
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('returns the data field from a successful response', async () => {
    const payload = { id: '1', name: 'My Project', slug: 'my-project' };
    vi.mocked(fetch).mockResolvedValue(makeResponse(200, { data: payload }));
    const result = await apiFetch<typeof payload>(mockConfig, '/api/projects/1');
    expect(result).toEqual(payload);
  });

  it('returns undefined for HTTP 204', async () => {
    vi.mocked(fetch).mockResolvedValue({ status: 204, ok: true } as unknown as Response);
    const result = await apiFetch(mockConfig, '/api/flags/key', { method: 'DELETE' });
    expect(result).toBeUndefined();
  });

  it('trims a trailing slash from serverUrl', async () => {
    const configWithSlash = { serverUrl: 'http://localhost:3000/', apiKey: 'flk_test', email: 'test@example.com' };
    vi.mocked(fetch).mockResolvedValue(makeResponse(200, { data: [] }));
    await apiFetch(configWithSlash, '/api/projects');
    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/projects', expect.anything());
  });

  describe('when the server returns an error response', () => {
    it('throws ApiResponseError', async () => {
      vi.mocked(fetch).mockResolvedValue(
        makeResponse(404, { error: { code: 'NOT_FOUND', message: 'Flag not found' } }),
      );
      await expect(apiFetch(mockConfig, '/api/flags/missing')).rejects.toThrow(ApiResponseError);
    });

    it('ApiResponseError carries the error code and status', async () => {
      vi.mocked(fetch).mockResolvedValue(
        makeResponse(409, { error: { code: 'CONFLICT', message: 'Slug already taken' } }),
      );
      const err = (await apiFetch(mockConfig, '/api/projects', { method: 'POST' }).catch(
        (e: unknown) => e,
      )) as ApiResponseError;
      expect(err).toBeInstanceOf(ApiResponseError);
      expect(err.code).toBe('CONFLICT');
      expect(err.status).toBe(409);
      expect(err.message).toBe('Slug already taken');
    });
  });
});
