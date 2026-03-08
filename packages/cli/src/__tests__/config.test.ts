import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn(),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocking
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readConfig, requireConfig, writeConfig } from '../config.js';

const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);
const mockMkdir = vi.mocked(mkdir);

describe('readConfig', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when config file does not exist', async () => {
    mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    const result = await readConfig();
    expect(result).toBeNull();
  });

  it('returns parsed config when file exists', async () => {
    const config = { serverUrl: 'http://localhost:3000', apiKey: 'flk_abc123' };
    mockReadFile.mockResolvedValue(JSON.stringify(config) as any);
    const result = await readConfig();
    expect(result).toEqual(config);
  });

  it('returns null when file contains invalid JSON', async () => {
    mockReadFile.mockResolvedValue('not-json' as any);
    const result = await readConfig();
    expect(result).toBeNull();
  });
});

describe('writeConfig', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates config directory and writes JSON', async () => {
    const config = { serverUrl: 'http://localhost:3000', apiKey: 'flk_abc123' };
    await writeConfig(config);
    expect(mockMkdir).toHaveBeenCalledWith(expect.stringContaining('falcon'), {
      recursive: true,
    });
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining('config.json'),
      JSON.stringify(config, null, 2),
      'utf-8',
    );
  });
});

describe('requireConfig', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('throws when no config file exists', async () => {
    mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    await expect(requireConfig()).rejects.toThrow('falcon init');
  });

  it('returns config when it exists', async () => {
    const config = { serverUrl: 'http://localhost:3000', apiKey: 'flk_abc123' };
    mockReadFile.mockResolvedValue(JSON.stringify(config) as any);
    const result = await requireConfig();
    expect(result).toEqual(config);
  });
});
