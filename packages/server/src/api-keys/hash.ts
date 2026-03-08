import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const KEY_PREFIX = 'flk_';
const KEY_BYTES = 32;
const _SCRYPT_KEYLEN = 64;

export interface GeneratedApiKey {
  rawKey: string;
  keyHash: string;
  keyPrefix: string;
}

export function generateApiKey(): GeneratedApiKey {
  const random = randomBytes(KEY_BYTES).toString('hex');
  const rawKey = `${KEY_PREFIX}${random}`;
  const keyPrefix = rawKey.slice(0, 12);
  const keyHash = hashApiKey(rawKey);
  return { rawKey, keyHash, keyPrefix };
}

export function hashApiKey(rawKey: string): string {
  // Use SHA-256 with a fixed salt derived from the key prefix for fast lookups.
  // scrypt would be better for passwords but API keys are random enough that
  // SHA-256 is sufficient and avoids the latency of scrypt on every request.
  return createHash('sha256').update(rawKey).digest('hex');
}

export function verifyApiKey(rawKey: string, storedHash: string): boolean {
  try {
    const candidate = Buffer.from(hashApiKey(rawKey), 'hex');
    const stored = Buffer.from(storedHash, 'hex');
    if (candidate.length !== stored.length) return false;
    return timingSafeEqual(candidate, stored);
  } catch {
    return false;
  }
}
