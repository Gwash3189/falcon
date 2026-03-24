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
import AuditLogList from '../audit-log/list.js';

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

describe('audit-log:list', () => {
  beforeEach(() => {
    mockRequireConfig.mockResolvedValue(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('calls GET /audit-log endpoint for the given environment', async () => {
    mockApiFetch.mockResolvedValue([]);
    captureOutput();

    await AuditLogList.run(['--project', 'proj-1', '--env', 'env-1'], CLI_ROOT);

    expect(mockApiFetch).toHaveBeenCalledWith(
      mockConfig,
      expect.stringContaining('/api/projects/proj-1/environments/env-1/audit-log'),
    );
  });

  it('passes flag-id filter when provided', async () => {
    mockApiFetch.mockResolvedValue([]);
    captureOutput();

    await AuditLogList.run(
      ['--project', 'proj-1', '--env', 'env-1', '--flag-id', 'flag-123'],
      CLI_ROOT,
    );

    expect(mockApiFetch).toHaveBeenCalledWith(
      mockConfig,
      expect.stringContaining('flag_id=flag-123'),
    );
  });

  it('renders entries with action, actor, and flag id', async () => {
    mockApiFetch.mockResolvedValue([
      {
        id: '1',
        flag_id: 'f-1',
        environment_id: 'env-1',
        action: 'created',
        actor: 'user@example.com',
        before_state: null,
        after_state: { key: 'test' },
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ]);
    const out = captureOutput();

    await AuditLogList.run(['--project', 'proj-1', '--env', 'env-1'], CLI_ROOT);

    const output = out.lines();
    expect(output).toContain('created');
    expect(output).toContain('user@example.com');
    expect(output).toContain('f-1');
  });

  it('outputs JSON when --json flag is set', async () => {
    const entries = [
      {
        id: '1',
        flag_id: 'f-1',
        environment_id: 'env-1',
        action: 'created',
        actor: 'user@example.com',
        before_state: null,
        after_state: {},
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ];
    mockApiFetch.mockResolvedValue(entries);
    const out = captureOutput();

    await AuditLogList.run(['--project', 'proj-1', '--env', 'env-1', '--json'], CLI_ROOT);

    const parsed = JSON.parse(out.lines());
    expect(parsed).toHaveLength(1);
    expect(parsed[0].action).toBe('created');
  });

  it('shows empty state message when no entries exist', async () => {
    mockApiFetch.mockResolvedValue([]);
    const out = captureOutput();

    await AuditLogList.run(['--project', 'proj-1', '--env', 'env-1'], CLI_ROOT);

    expect(out.lines()).toContain('No audit log entries found');
  });
});
