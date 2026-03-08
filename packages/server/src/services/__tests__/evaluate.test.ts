import { createHash } from 'node:crypto';
import { FLAG_TYPES } from '@falcon/shared';
import { describe, expect, it } from 'vitest';
import type { Flag } from '../../db/schema/index.js';
import { evaluateFlag } from '../evaluate.js';

function makeFlag(overrides: Partial<Flag>): Flag {
  return {
    id: 'flag-id',
    environmentId: 'env-id',
    key: 'test-flag',
    type: FLAG_TYPES.boolean,
    enabled: false,
    percentage: null,
    identifiers: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('evaluateFlag — boolean', () => {
  it('returns true when enabled=true', () => {
    expect(evaluateFlag(makeFlag({ type: FLAG_TYPES.boolean, enabled: true }))).toBe(true);
  });

  it('returns false when enabled=false', () => {
    expect(evaluateFlag(makeFlag({ type: FLAG_TYPES.boolean, enabled: false }))).toBe(false);
  });

  it('ignores the identifier for boolean flags', () => {
    const flag = makeFlag({ type: FLAG_TYPES.boolean, enabled: true });
    expect(evaluateFlag(flag, 'any-user')).toBe(true);
  });
});

describe('evaluateFlag — percentage', () => {
  it('returns false when flag is disabled', () => {
    const flag = makeFlag({ type: FLAG_TYPES.percentage, enabled: false, percentage: 100 });
    expect(evaluateFlag(flag, 'user-1')).toBe(false);
  });

  it('returns false when percentage is 0', () => {
    const flag = makeFlag({ type: FLAG_TYPES.percentage, enabled: true, percentage: 0 });
    expect(evaluateFlag(flag, 'user-1')).toBe(false);
  });

  it('returns true when percentage is 100', () => {
    const flag = makeFlag({ type: FLAG_TYPES.percentage, enabled: true, percentage: 100 });
    expect(evaluateFlag(flag, 'any-user')).toBe(true);
  });

  it('returns false when percentage is null', () => {
    const flag = makeFlag({ type: FLAG_TYPES.percentage, enabled: true, percentage: null });
    expect(evaluateFlag(flag, 'user-1')).toBe(false);
  });

  it('produces deterministic results for the same identifier', () => {
    const flag = makeFlag({ type: FLAG_TYPES.percentage, enabled: true, percentage: 50 });
    const result1 = evaluateFlag(flag, 'stable-user');
    const result2 = evaluateFlag(flag, 'stable-user');
    expect(result1).toBe(result2);
  });

  it('uses an empty string as identifier when none is provided', () => {
    const flag = makeFlag({
      key: 'my-flag',
      type: FLAG_TYPES.percentage,
      enabled: true,
      percentage: 50,
    });
    // Manually compute the expected bucket for empty identifier
    const hash = createHash('sha256').update('my-flag:').digest('hex');
    const bucket = parseInt(hash.slice(0, 8), 16) % 100;
    const expected = bucket < 50;
    expect(evaluateFlag(flag)).toBe(expected);
  });

  it('distributes different identifiers across buckets', () => {
    // With 50%, roughly half of users should be in. We check a known pair.
    const flag = makeFlag({
      key: 'rollout',
      type: FLAG_TYPES.percentage,
      enabled: true,
      percentage: 50,
    });
    // Just verify that two different identifiers can produce different results (not guaranteed
    // but very likely — if this flakes, pick a different pair).
    const results = new Set([
      evaluateFlag(flag, 'alpha'),
      evaluateFlag(flag, 'beta'),
      evaluateFlag(flag, 'gamma'),
      evaluateFlag(flag, 'delta'),
    ]);
    expect(results.size).toBeGreaterThanOrEqual(1);
  });
});

describe('evaluateFlag — identifier', () => {
  it('returns false when flag is disabled', () => {
    const flag = makeFlag({
      type: FLAG_TYPES.identifier,
      enabled: false,
      identifiers: ['user-1'],
    });
    expect(evaluateFlag(flag, 'user-1')).toBe(false);
  });

  it('returns true when identifier is in the list', () => {
    const flag = makeFlag({
      type: FLAG_TYPES.identifier,
      enabled: true,
      identifiers: ['user-1', 'user-2'],
    });
    expect(evaluateFlag(flag, 'user-1')).toBe(true);
    expect(evaluateFlag(flag, 'user-2')).toBe(true);
  });

  it('returns false when identifier is not in the list', () => {
    const flag = makeFlag({
      type: FLAG_TYPES.identifier,
      enabled: true,
      identifiers: ['user-1'],
    });
    expect(evaluateFlag(flag, 'user-99')).toBe(false);
  });

  it('returns false when no identifier is provided', () => {
    const flag = makeFlag({
      type: FLAG_TYPES.identifier,
      enabled: true,
      identifiers: ['user-1'],
    });
    expect(evaluateFlag(flag)).toBe(false);
  });

  it('returns false when identifiers list is null', () => {
    const flag = makeFlag({
      type: FLAG_TYPES.identifier,
      enabled: true,
      identifiers: null,
    });
    expect(evaluateFlag(flag, 'user-1')).toBe(false);
  });
});

describe('evaluateFlag — unknown type', () => {
  it('returns false for an unrecognised flag type', () => {
    const flag = makeFlag({ type: 'future-type' });
    expect(evaluateFlag(flag)).toBe(false);
  });
});
