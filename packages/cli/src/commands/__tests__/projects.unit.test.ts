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
import ProjectsCreate from '../projects/create.js';
import ProjectsList from '../projects/list.js';

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

describe('projects:list', () => {
  beforeEach(() => {
    mockRequireConfig.mockResolvedValue(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('calls GET /api/projects', async () => {
    mockApiFetch.mockResolvedValue([]);
    captureOutput();

    await ProjectsList.run([], CLI_ROOT);

    expect(mockApiFetch).toHaveBeenCalledWith(mockConfig, '/api/projects');
  });

  it('renders project name, slug, and id', async () => {
    mockApiFetch.mockResolvedValue([
      { id: 'proj-uuid', name: 'My App', slug: 'my-app', created_at: '2024-01-01' },
    ]);
    const out = captureOutput();

    await ProjectsList.run([], CLI_ROOT);

    const output = out.lines();
    expect(output).toContain('My App');
    expect(output).toContain('my-app');
    expect(output).toContain('proj-uuid');
  });

  it('outputs JSON array when --json is set', async () => {
    const projects = [
      { id: 'proj-uuid', name: 'My App', slug: 'my-app', created_at: '2024-01-01' },
    ];
    mockApiFetch.mockResolvedValue(projects);
    const out = captureOutput();

    await ProjectsList.run(['--json'], CLI_ROOT);

    const parsed = JSON.parse(out.lines());
    expect(parsed).toHaveLength(1);
    expect(parsed[0].slug).toBe('my-app');
  });

  it('shows empty state message when no projects exist', async () => {
    mockApiFetch.mockResolvedValue([]);
    const out = captureOutput();

    await ProjectsList.run([], CLI_ROOT);

    expect(out.lines()).toContain('No projects yet');
  });
});

describe('projects:create', () => {
  beforeEach(() => {
    mockRequireConfig.mockResolvedValue(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('calls POST /api/projects with name and slug', async () => {
    mockApiFetch.mockResolvedValue({ id: 'proj-uuid', name: 'My App', slug: 'my-app' });
    captureOutput();

    await ProjectsCreate.run(['My App', '--slug', 'my-app'], CLI_ROOT);

    expect(mockApiFetch).toHaveBeenCalledWith(
      mockConfig,
      '/api/projects',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"slug":"my-app"'),
      }),
    );
  });

  it('sends the project name in the request body', async () => {
    mockApiFetch.mockResolvedValue({ id: 'proj-uuid', name: 'My App', slug: 'my-app' });
    captureOutput();

    await ProjectsCreate.run(['My App', '--slug', 'my-app'], CLI_ROOT);

    const body = JSON.parse((vi.mocked(mockApiFetch).mock.calls[0]?.[2] as { body: string }).body);
    expect(body.name).toBe('My App');
    expect(body.slug).toBe('my-app');
  });

  it('outputs JSON when --json flag is set', async () => {
    const project = { id: 'proj-uuid', name: 'My App', slug: 'my-app' };
    mockApiFetch.mockResolvedValue(project);
    const out = captureOutput();

    await ProjectsCreate.run(['My App', '--slug', 'my-app', '--json'], CLI_ROOT);

    const parsed = JSON.parse(out.lines());
    expect(parsed.id).toBe('proj-uuid');
    expect(parsed.slug).toBe('my-app');
  });

  it('shows project id and next steps in human output', async () => {
    mockApiFetch.mockResolvedValue({ id: 'proj-uuid', name: 'My App', slug: 'my-app' });
    const out = captureOutput();

    await ProjectsCreate.run(['My App', '--slug', 'my-app'], CLI_ROOT);

    const output = out.lines();
    expect(output).toContain('proj-uuid');
    expect(output).toContain('environments:create');
  });
});
