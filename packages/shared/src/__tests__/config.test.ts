import { describe, expect, it } from 'vitest';
import { parseEnv } from '../config.js';

describe('parseEnv', () => {
  it('throws a readable error when DATABASE_URL is missing', () => {
    expect(() => parseEnv({})).toThrow('Invalid environment variables:');
  });

  it('returns typed AppConfig when env is valid', () => {
    const config = parseEnv({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      VALKEY_URL: 'redis://localhost:6379',
      PORT: '4000',
      NODE_ENV: 'test',
    });

    expect(config.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/db');
    expect(config.VALKEY_URL).toBe('redis://localhost:6379');
    expect(config.PORT).toBe(4000);
    expect(config.NODE_ENV).toBe('test');
  });
});
