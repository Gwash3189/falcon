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
import EnvironmentsCreate from '../environments/create.js';
import EnvironmentsList from '../environments/list.js';

const mockApiFetch = vi.mocked(apiFetch);
const mockRequireConfig = vi.mocked(requireConfig);
const mockConfig = { serverUrl: 'http://localhost:3000', apiKey: 'flk_test', email: 'test@example.com' };

function captureOutput(): { lines: () => string } {
  const logs: string[] = [];
  vi.spyOn(Command.prototype, 'log').mockImplementation((msg = '') => {
    logs.push(msg);
  });
  return { lines: () => logs.join('\n') };
}

describe('environments:list', () => {
  beforeEach(() => {
    mockRequireConfig.mockResolvedValue(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('calls GET /api/projects/:projectId/environments', async () => {
    mockApiFetch.mockResolvedValue([]);
    captureOutput();

    await EnvironmentsList.run(['--project', 'proj-1'], CLI_ROOT);

    expect(mockApiFetch).toHaveBeenCalledWith(mockConfig, '/api/projects/proj-1/environments');
  });

  it('renders environment name, slug, and id', async () => {
    mockApiFetch.mockResolvedValue([
      { id: 'env-uuid', name: 'Production', slug: 'production', project_id: 'proj-1' },
    ]);
    const out = captureOutput();

    await EnvironmentsList.run(['--project', 'proj-1'], CLI_ROOT);

    const output = out.lines();
    expect(output).toContain('Production');
    expect(output).toContain('production');
    expect(output).toContain('env-uuid');
  });

  it('outputs JSON when --json is set', async () => {
    const envs = [{ id: 'env-uuid', name: 'Production', slug: 'production', project_id: 'proj-1' }];
    mockApiFetch.mockResolvedValue(envs);
    const out = captureOutput();

    await EnvironmentsList.run(['--project', 'proj-1', '--json'], CLI_ROOT);

    const parsed = JSON.parse(out.lines());
    expect(parsed).toHaveLength(1);
    expect(parsed[0].slug).toBe('production');
  });

  it('shows empty state message when no environments exist', async () => {
    mockApiFetch.mockResolvedValue([]);
    const out = captureOutput();

    await EnvironmentsList.run(['--project', 'proj-1'], CLI_ROOT);

    expect(out.lines()).toContain('No environments yet');
  });
});

describe('environments:create', () => {
  beforeEach(() => {
    mockRequireConfig.mockResolvedValue(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('calls POST /api/projects/:projectId/environments with name and slug', async () => {
    mockApiFetch.mockResolvedValue({
      id: 'env-uuid',
      name: 'Production',
      slug: 'production',
      project_id: 'proj-1',
    });
    captureOutput();

    await EnvironmentsCreate.run(
      ['Production', '--project', 'proj-1', '--slug', 'production'],
      CLI_ROOT,
    );

    expect(mockApiFetch).toHaveBeenCalledWith(
      mockConfig,
      '/api/projects/proj-1/environments',
      expect.objectContaining({ method: 'POST' }),
    );

    const body = JSON.parse((vi.mocked(mockApiFetch).mock.calls[0]?.[2] as { body: string }).body);
    expect(body.name).toBe('Production');
    expect(body.slug).toBe('production');
  });

  it('outputs JSON when --json is set', async () => {
    const env = { id: 'env-uuid', name: 'Production', slug: 'production', project_id: 'proj-1' };
    mockApiFetch.mockResolvedValue(env);
    const out = captureOutput();

    await EnvironmentsCreate.run(
      ['Production', '--project', 'proj-1', '--slug', 'production', '--json'],
      CLI_ROOT,
    );

    const parsed = JSON.parse(out.lines());
    expect(parsed.id).toBe('env-uuid');
  });

  it('shows environment id and next steps in human output', async () => {
    mockApiFetch.mockResolvedValue({
      id: 'env-uuid',
      name: 'Production',
      slug: 'production',
      project_id: 'proj-1',
    });
    const out = captureOutput();

    await EnvironmentsCreate.run(
      ['Production', '--project', 'proj-1', '--slug', 'production'],
      CLI_ROOT,
    );

    const output = out.lines();
    expect(output).toContain('env-uuid');
    expect(output).toContain('api-keys:create');
  });
});
