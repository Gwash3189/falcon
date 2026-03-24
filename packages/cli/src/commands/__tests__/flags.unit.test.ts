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
import FlagsCreate from '../flags/create.js';
import FlagsDelete from '../flags/delete.js';
import FlagsList from '../flags/list.js';
import FlagsUpdate from '../flags/update.js';

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

describe('flags:create', () => {
  beforeEach(() => {
    mockRequireConfig.mockResolvedValue(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('creates a boolean flag and calls the correct endpoint', async () => {
    mockApiFetch.mockResolvedValue({ id: '1', key: 'dark-mode', type: 'boolean', enabled: false });
    captureOutput();

    await FlagsCreate.run(
      ['dark-mode', '--project', 'proj-1', '--env', 'env-1', '--type', 'boolean'],
      CLI_ROOT,
    );

    expect(mockApiFetch).toHaveBeenCalledWith(
      mockConfig,
      '/api/projects/proj-1/environments/env-1/flags',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"type":"boolean"'),
      }),
    );
  });

  it('sends enabled:true when --enabled flag is set', async () => {
    mockApiFetch.mockResolvedValue({ id: '1', key: 'dark-mode', type: 'boolean', enabled: true });
    captureOutput();

    await FlagsCreate.run(
      ['dark-mode', '--project', 'proj-1', '--env', 'env-1', '--type', 'boolean', '--enabled'],
      CLI_ROOT,
    );

    const body = JSON.parse((vi.mocked(mockApiFetch).mock.calls[0]?.[2] as { body: string }).body);
    expect(body.enabled).toBe(true);
  });

  it('creates a percentage rollout flag with percentage value', async () => {
    mockApiFetch.mockResolvedValue({
      id: '2',
      key: 'new-checkout',
      type: 'percentage',
      enabled: false,
      percentage: 20,
    });
    captureOutput();

    await FlagsCreate.run(
      [
        'new-checkout',
        '--project',
        'proj-1',
        '--env',
        'env-1',
        '--type',
        'percentage',
        '--percentage',
        '20',
      ],
      CLI_ROOT,
    );

    const body = JSON.parse((vi.mocked(mockApiFetch).mock.calls[0]?.[2] as { body: string }).body);
    expect(body.type).toBe('percentage');
    expect(body.percentage).toBe(20);
  });

  it('creates an identifier-targeting flag with parsed identifier list', async () => {
    mockApiFetch.mockResolvedValue({
      id: '3',
      key: 'beta-access',
      type: 'identifier',
      enabled: false,
      identifiers: ['user-1', 'user-2', 'user-3'],
    });
    captureOutput();

    await FlagsCreate.run(
      [
        'beta-access',
        '--project',
        'proj-1',
        '--env',
        'env-1',
        '--type',
        'identifier',
        '--identifiers',
        'user-1,user-2,user-3',
      ],
      CLI_ROOT,
    );

    const body = JSON.parse((vi.mocked(mockApiFetch).mock.calls[0]?.[2] as { body: string }).body);
    expect(body.type).toBe('identifier');
    expect(body.identifiers).toEqual(['user-1', 'user-2', 'user-3']);
  });

  it('trims whitespace from identifiers', async () => {
    mockApiFetch.mockResolvedValue({
      id: '4',
      key: 'beta',
      type: 'identifier',
      enabled: false,
      identifiers: ['user-1', 'user-2'],
    });
    captureOutput();

    await FlagsCreate.run(
      [
        'beta',
        '--project',
        'proj-1',
        '--env',
        'env-1',
        '--type',
        'identifier',
        '--identifiers',
        'user-1, user-2',
      ],
      CLI_ROOT,
    );

    const body = JSON.parse((vi.mocked(mockApiFetch).mock.calls[0]?.[2] as { body: string }).body);
    expect(body.identifiers).toEqual(['user-1', 'user-2']);
  });

  it('outputs JSON when --json flag is set', async () => {
    const flag = {
      id: '1',
      key: 'dark-mode',
      type: 'boolean',
      enabled: false,
      percentage: null,
      identifiers: null,
    };
    mockApiFetch.mockResolvedValue(flag);
    const out = captureOutput();

    await FlagsCreate.run(
      ['dark-mode', '--project', 'proj-1', '--env', 'env-1', '--type', 'boolean', '--json'],
      CLI_ROOT,
    );

    expect(out.lines()).toContain('"key": "dark-mode"');
  });

  it('errors when --percentage is missing for type=percentage', async () => {
    captureOutput();
    await expect(
      FlagsCreate.run(
        ['rollout', '--project', 'proj-1', '--env', 'env-1', '--type', 'percentage'],
        CLI_ROOT,
      ),
    ).rejects.toThrow();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('errors when --identifiers is missing for type=identifier', async () => {
    captureOutput();
    await expect(
      FlagsCreate.run(
        ['beta', '--project', 'proj-1', '--env', 'env-1', '--type', 'identifier'],
        CLI_ROOT,
      ),
    ).rejects.toThrow();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });
});

describe('flags:list', () => {
  beforeEach(() => {
    mockRequireConfig.mockResolvedValue(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('calls GET /flags endpoint for the given environment', async () => {
    mockApiFetch.mockResolvedValue([]);
    captureOutput();

    await FlagsList.run(['--project', 'proj-1', '--env', 'env-1'], CLI_ROOT);

    expect(mockApiFetch).toHaveBeenCalledWith(
      mockConfig,
      '/api/projects/proj-1/environments/env-1/flags',
    );
  });

  it('renders flag key, type, and status', async () => {
    mockApiFetch.mockResolvedValue([
      {
        id: '1',
        key: 'dark-mode',
        type: 'boolean',
        enabled: true,
        percentage: null,
        identifiers: null,
      },
      {
        id: '2',
        key: 'new-ui',
        type: 'percentage',
        enabled: true,
        percentage: 25,
        identifiers: null,
      },
      {
        id: '3',
        key: 'beta',
        type: 'identifier',
        enabled: false,
        percentage: null,
        identifiers: ['u1', 'u2'],
      },
    ]);
    const out = captureOutput();

    await FlagsList.run(['--project', 'proj-1', '--env', 'env-1'], CLI_ROOT);

    const output = out.lines();
    expect(output).toContain('dark-mode');
    expect(output).toContain('boolean');
    expect(output).toContain('25%');
    expect(output).toContain('2 identifiers');
  });

  it('outputs JSON array when --json flag is set', async () => {
    const flags = [
      {
        id: '1',
        key: 'dark-mode',
        type: 'boolean',
        enabled: true,
        percentage: null,
        identifiers: null,
      },
    ];
    mockApiFetch.mockResolvedValue(flags);
    const out = captureOutput();

    await FlagsList.run(['--project', 'proj-1', '--env', 'env-1', '--json'], CLI_ROOT);

    const parsed = JSON.parse(out.lines());
    expect(parsed).toHaveLength(1);
    expect(parsed[0].key).toBe('dark-mode');
  });

  it('shows empty state message when no flags exist', async () => {
    mockApiFetch.mockResolvedValue([]);
    const out = captureOutput();

    await FlagsList.run(['--project', 'proj-1', '--env', 'env-1'], CLI_ROOT);

    expect(out.lines()).toContain('No flags yet');
  });
});

describe('flags:update', () => {
  beforeEach(() => {
    mockRequireConfig.mockResolvedValue(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('enables a flag with --enabled', async () => {
    mockApiFetch.mockResolvedValue({ id: '1', key: 'dark-mode', type: 'boolean', enabled: true });
    captureOutput();

    await FlagsUpdate.run(
      ['dark-mode', '--project', 'proj-1', '--env', 'env-1', '--enabled'],
      CLI_ROOT,
    );

    const body = JSON.parse((vi.mocked(mockApiFetch).mock.calls[0]?.[2] as { body: string }).body);
    expect(body.enabled).toBe(true);
    expect(mockApiFetch).toHaveBeenCalledWith(
      mockConfig,
      '/api/projects/proj-1/environments/env-1/flags/dark-mode',
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('disables a flag with --no-enabled', async () => {
    mockApiFetch.mockResolvedValue({ id: '1', key: 'dark-mode', type: 'boolean', enabled: false });
    captureOutput();

    await FlagsUpdate.run(
      ['dark-mode', '--project', 'proj-1', '--env', 'env-1', '--no-enabled'],
      CLI_ROOT,
    );

    const body = JSON.parse((vi.mocked(mockApiFetch).mock.calls[0]?.[2] as { body: string }).body);
    expect(body.enabled).toBe(false);
  });

  it('updates percentage rollout value', async () => {
    mockApiFetch.mockResolvedValue({ id: '2', key: 'rollout', type: 'percentage', enabled: true });
    captureOutput();

    await FlagsUpdate.run(
      ['rollout', '--project', 'proj-1', '--env', 'env-1', '--percentage', '50'],
      CLI_ROOT,
    );

    const body = JSON.parse((vi.mocked(mockApiFetch).mock.calls[0]?.[2] as { body: string }).body);
    expect(body.percentage).toBe(50);
  });

  it('updates identifier list', async () => {
    mockApiFetch.mockResolvedValue({ id: '3', key: 'beta', type: 'identifier', enabled: true });
    captureOutput();

    await FlagsUpdate.run(
      ['beta', '--project', 'proj-1', '--env', 'env-1', '--identifiers', 'a,b,c'],
      CLI_ROOT,
    );

    const body = JSON.parse((vi.mocked(mockApiFetch).mock.calls[0]?.[2] as { body: string }).body);
    expect(body.identifiers).toEqual(['a', 'b', 'c']);
  });

  it('errors when no update fields are provided', async () => {
    captureOutput();
    await expect(
      FlagsUpdate.run(['dark-mode', '--project', 'proj-1', '--env', 'env-1'], CLI_ROOT),
    ).rejects.toThrow();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });
});

describe('flags:delete', () => {
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

    await FlagsDelete.run(['dark-mode', '--project', 'proj-1', '--env', 'env-1'], CLI_ROOT);

    expect(mockApiFetch).toHaveBeenCalledWith(
      mockConfig,
      '/api/projects/proj-1/environments/env-1/flags/dark-mode',
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(out.lines()).toContain('dark-mode');
  });
});
