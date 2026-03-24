import { Command } from '@oclif/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CLI_ROOT = new URL('../../../../', import.meta.url).pathname;

vi.mock('../../config.js', () => ({
  requireConfig: vi.fn(),
}));

vi.mock('../../http.js', () => ({
  apiFetch: vi.fn(),
  ApiResponseError: class ApiResponseError extends Error {
    constructor(
      public code: string,
      message: string,
      public status: number,
    ) {
      super(message);
    }
  },
}));

import { requireConfig } from '../../config.js';
import { apiFetch } from '../../http.js';
import ApiKeysCreate from '../api-keys/create.js';
import ApiKeysRevoke from '../api-keys/revoke.js';

const mockApiFetch = vi.mocked(apiFetch);
const mockRequireConfig = vi.mocked(requireConfig);
const mockConfig = {
  serverUrl: 'http://localhost:3000',
  apiKey: 'flk_test',
  email: 'test@example.com',
};

function captureOutput(): { lines: () => string } {
  const logs: string[] = [];
  vi.spyOn(Command.prototype, 'log').mockImplementation((msg = '') => {
    logs.push(msg);
  });
  return { lines: () => logs.join('\n') };
}

describe('api-keys:create', () => {
  beforeEach(() => {
    mockRequireConfig.mockResolvedValue(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('calls POST to the correct endpoint', async () => {
    mockApiFetch.mockResolvedValue({
      id: 'key-uuid',
      key_prefix: 'flk_abc12',
      environment_id: 'env-1',
      rawKey: 'flk_abc123def456',
    });
    captureOutput();

    await ApiKeysCreate.run(['--project', 'proj-1', '--env', 'env-1'], CLI_ROOT);

    expect(mockApiFetch).toHaveBeenCalledWith(
      mockConfig,
      '/api/projects/proj-1/environments/env-1/api-keys',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('displays the raw key in output (shown only once)', async () => {
    mockApiFetch.mockResolvedValue({
      id: 'key-uuid',
      key_prefix: 'flk_abc12',
      environment_id: 'env-1',
      rawKey: 'flk_abc123def456_super_secret',
    });
    const out = captureOutput();

    await ApiKeysCreate.run(['--project', 'proj-1', '--env', 'env-1'], CLI_ROOT);

    expect(out.lines()).toContain('flk_abc123def456_super_secret');
  });

  it('warns the user to save the key', async () => {
    mockApiFetch.mockResolvedValue({
      id: 'key-uuid',
      key_prefix: 'flk_abc12',
      environment_id: 'env-1',
      rawKey: 'flk_abc123def456',
    });
    const out = captureOutput();

    await ApiKeysCreate.run(['--project', 'proj-1', '--env', 'env-1'], CLI_ROOT);

    expect(out.lines()).toContain('NOT be shown again');
  });

  it('outputs JSON when --json is set', async () => {
    const key = {
      id: 'key-uuid',
      key_prefix: 'flk_abc12',
      environment_id: 'env-1',
      rawKey: 'flk_abc123def456',
    };
    mockApiFetch.mockResolvedValue(key);
    const out = captureOutput();

    await ApiKeysCreate.run(['--project', 'proj-1', '--env', 'env-1', '--json'], CLI_ROOT);

    const parsed = JSON.parse(out.lines());
    expect(parsed.rawKey).toBe('flk_abc123def456');
    expect(parsed.id).toBe('key-uuid');
  });
});

describe('api-keys:revoke', () => {
  beforeEach(() => {
    mockRequireConfig.mockResolvedValue(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('calls DELETE on the correct endpoint', async () => {
    mockApiFetch.mockResolvedValue(undefined);
    const out = captureOutput();

    await ApiKeysRevoke.run(['key-uuid', '--project', 'proj-1', '--env', 'env-1'], CLI_ROOT);

    expect(mockApiFetch).toHaveBeenCalledWith(
      mockConfig,
      '/api/projects/proj-1/environments/env-1/api-keys/key-uuid',
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(out.lines()).toContain('key-uuid');
  });
});
