import { Command } from '@oclif/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CLI_ROOT = new URL('../../../../', import.meta.url).pathname;

function captureOutput(): { lines: () => string } {
  const logs: string[] = [];
  vi.spyOn(Command.prototype, 'log').mockImplementation((msg = '') => {
    logs.push(msg);
  });
  return { lines: () => logs.join('\n') };
}

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import AdminKeysCreate from '../admin/keys/create.js';
import AdminKeysList from '../admin/keys/list.js';
import AdminKeysRevoke from '../admin/keys/revoke.js';

describe('admin:keys:create', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('sends Authorization: Bearer <admin-key> to POST /admin/keys', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: 'key-1',
          email: 'user@example.com',
          keyPrefix: 'flk_abc123',
          rawKey: 'flk_abc123full',
          createdAt: '2024-01-01',
        },
      }),
    });
    captureOutput();

    await AdminKeysCreate.run(
      [
        'user@example.com',
        '--admin-key',
        'my-bootstrap-key',
        '--server-url',
        'http://localhost:4000',
      ],
      CLI_ROOT,
    );

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:4000/admin/keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer my-bootstrap-key',
      },
      body: JSON.stringify({ email: 'user@example.com' }),
    });
  });

  it('outputs JSON when --json is set', async () => {
    const keyData = {
      id: 'key-1',
      email: 'user@example.com',
      keyPrefix: 'flk_abc123',
      rawKey: 'flk_abc123full',
      createdAt: '2024-01-01',
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: keyData }),
    });
    const out = captureOutput();

    await AdminKeysCreate.run(
      ['user@example.com', '--admin-key', 'my-bootstrap-key', '--json'],
      CLI_ROOT,
    );

    const parsed = JSON.parse(out.lines());
    expect(parsed.email).toBe('user@example.com');
    expect(parsed.rawKey).toBe('flk_abc123full');
  });

  it('fails with clear error when --admin-key is not provided', async () => {
    captureOutput();

    await expect(AdminKeysCreate.run(['user@example.com'], CLI_ROOT)).rejects.toThrow(/admin key/i);
  });
});

describe('admin:keys:list', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('sends Authorization: Bearer <admin-key> to GET /admin/keys', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
    captureOutput();

    await AdminKeysList.run(['--admin-key', 'my-bootstrap-key'], CLI_ROOT);

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/admin/keys', {
      headers: { Authorization: 'Bearer my-bootstrap-key' },
    });
  });

  it('renders key list with status', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'key-1',
            email: 'admin@example.com',
            keyPrefix: 'flk_abc',
            createdAt: '2024-01-01',
            revokedAt: null,
          },
        ],
      }),
    });
    const out = captureOutput();

    await AdminKeysList.run(['--admin-key', 'my-bootstrap-key'], CLI_ROOT);

    const output = out.lines();
    expect(output).toContain('active');
    expect(output).toContain('admin@example.com');
  });

  it('shows empty state when no keys exist', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
    const out = captureOutput();

    await AdminKeysList.run(['--admin-key', 'my-bootstrap-key'], CLI_ROOT);

    expect(out.lines()).toContain('No user keys found');
  });
});

describe('admin:keys:revoke', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('sends Authorization: Bearer <admin-key> to DELETE /admin/keys/:email', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204 });
    captureOutput();

    await AdminKeysRevoke.run(['user@example.com', '--admin-key', 'my-bootstrap-key'], CLI_ROOT);

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/admin/keys/user%40example.com', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer my-bootstrap-key' },
    });
  });

  it('outputs JSON when --json is set', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204 });
    const out = captureOutput();

    await AdminKeysRevoke.run(
      ['user@example.com', '--admin-key', 'my-bootstrap-key', '--json'],
      CLI_ROOT,
    );

    const parsed = JSON.parse(out.lines());
    expect(parsed.revoked).toBe(true);
    expect(parsed.email).toBe('user@example.com');
  });
});
