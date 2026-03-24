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
  afterEach(() => vi.clearAllMocks());

  describe('when config file does not exist', () => {
    it('returns null', async () => {
      mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      const result = await readConfig();
      expect(result).toBeNull();
    });
  });

  describe('when config file exists with valid JSON', () => {
    it('returns parsed config', async () => {
      const config = {
        serverUrl: 'http://localhost:3000',
        apiKey: 'flk_abc123',
      };
      mockReadFile.mockResolvedValue(JSON.stringify(config));
      const result = await readConfig();
      expect(result).toEqual(config);
    });
  });

  describe('when config file contains invalid JSON', () => {
    it('returns null', async () => {
      mockReadFile.mockResolvedValue('not-json');
      const result = await readConfig();
      expect(result).toBeNull();
    });
  });
});

describe('writeConfig', () => {
  afterEach(() => vi.clearAllMocks());

  it('creates the config directory and writes JSON', async () => {
    const config = { serverUrl: 'http://localhost:3000', apiKey: 'flk_abc123', email: 'test@example.com' };
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
  afterEach(() => vi.clearAllMocks());

  describe('when no config file exists', () => {
    it('throws with helpful message', async () => {
      mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      await expect(requireConfig()).rejects.toThrow('falcon init');
    });
  });

  describe('when config file exists', () => {
    it('returns the config', async () => {
      const config = {
        serverUrl: 'http://localhost:3000',
        apiKey: 'flk_abc123',
      };
      mockReadFile.mockResolvedValue(JSON.stringify(config));
      const result = await requireConfig();
      expect(result).toEqual(config);
    });
  });
});
