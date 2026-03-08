import { describe, expect, it } from 'vitest';
import { generateApiKey, hashApiKey, verifyApiKey } from '../hash.js';

describe('generateApiKey', () => {
  it('returns a raw key with the flk_ prefix', () => {
    const { rawKey } = generateApiKey();
    expect(rawKey.startsWith('flk_')).toBe(true);
  });

  it('returns a raw key with 64 hex chars after the prefix (32 bytes)', () => {
    const { rawKey } = generateApiKey();
    const hex = rawKey.slice(4);
    expect(hex).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(hex)).toBe(true);
  });

  it('returns a keyPrefix that is the first 12 chars of the raw key', () => {
    const { rawKey, keyPrefix } = generateApiKey();
    expect(keyPrefix).toBe(rawKey.slice(0, 12));
  });

  it('returns a keyHash that is a 64-char hex string (SHA-256)', () => {
    const { keyHash } = generateApiKey();
    expect(keyHash).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(keyHash)).toBe(true);
  });

  it('generates unique keys on each call', () => {
    const first = generateApiKey();
    const second = generateApiKey();
    expect(first.rawKey).not.toBe(second.rawKey);
    expect(first.keyHash).not.toBe(second.keyHash);
  });
});

describe('hashApiKey', () => {
  it('is deterministic for the same input', () => {
    const key = 'flk_testkey';
    expect(hashApiKey(key)).toBe(hashApiKey(key));
  });

  it('produces different hashes for different keys', () => {
    expect(hashApiKey('flk_aaa')).not.toBe(hashApiKey('flk_bbb'));
  });

  it('returns a 64-char hex string', () => {
    const hash = hashApiKey('flk_somekey');
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });
});

describe('verifyApiKey', () => {
  it('returns true when raw key matches the stored hash', () => {
    const { rawKey, keyHash } = generateApiKey();
    expect(verifyApiKey(rawKey, keyHash)).toBe(true);
  });

  it('returns false when raw key does not match the stored hash', () => {
    const { keyHash } = generateApiKey();
    const { rawKey: otherKey } = generateApiKey();
    expect(verifyApiKey(otherKey, keyHash)).toBe(false);
  });

  it('returns false for an empty string against a valid hash', () => {
    const { keyHash } = generateApiKey();
    expect(verifyApiKey('', keyHash)).toBe(false);
  });

  it('returns false for a malformed stored hash', () => {
    const { rawKey } = generateApiKey();
    expect(verifyApiKey(rawKey, 'not-hex')).toBe(false);
  });
});
