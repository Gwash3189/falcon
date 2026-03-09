import { describe, expect, it } from 'vitest';
import { evaluateFlagCommand } from '../evaluate_flag.js';

const baseFlag = {
  id: 'flag-1',
  environmentId: 'env-1',
  key: 'my-flag',
  enabled: true,
  percentage: null,
  identifiers: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('evaluateFlagCommand', () => {
  describe('when the flag type is boolean', () => {
    it('returns true when enabled is true', () => {
      const result = evaluateFlagCommand({
        dependencies: {},
        params: { flag: { ...baseFlag, type: 'boolean', enabled: true } },
      });
      expect(result).toBe(true);
    });

    it('returns false when enabled is false', () => {
      const result = evaluateFlagCommand({
        dependencies: {},
        params: { flag: { ...baseFlag, type: 'boolean', enabled: false } },
      });
      expect(result).toBe(false);
    });
  });

  describe('when the flag type is percentage', () => {
    it('returns false when the flag is disabled', () => {
      const result = evaluateFlagCommand({
        dependencies: {},
        params: {
          flag: { ...baseFlag, type: 'percentage', enabled: false, percentage: 100 },
          identifier: 'user-1',
        },
      });
      expect(result).toBe(false);
    });

    it('returns false when percentage is null', () => {
      const result = evaluateFlagCommand({
        dependencies: {},
        params: {
          flag: { ...baseFlag, type: 'percentage', enabled: true, percentage: null },
          identifier: 'user-1',
        },
      });
      expect(result).toBe(false);
    });

    it('returns true for 100% rollout', () => {
      const result = evaluateFlagCommand({
        dependencies: {},
        params: {
          flag: { ...baseFlag, type: 'percentage', enabled: true, percentage: 100 },
          identifier: 'any-user',
        },
      });
      expect(result).toBe(true);
    });

    it('returns false for 0% rollout', () => {
      const result = evaluateFlagCommand({
        dependencies: {},
        params: {
          flag: { ...baseFlag, type: 'percentage', enabled: true, percentage: 0 },
          identifier: 'any-user',
        },
      });
      expect(result).toBe(false);
    });
  });

  describe('when the flag type is identifier', () => {
    it('returns false when the flag is disabled', () => {
      const result = evaluateFlagCommand({
        dependencies: {},
        params: {
          flag: { ...baseFlag, type: 'identifier', enabled: false, identifiers: ['user-1'] },
          identifier: 'user-1',
        },
      });
      expect(result).toBe(false);
    });

    it('returns true when identifier is in the list', () => {
      const result = evaluateFlagCommand({
        dependencies: {},
        params: {
          flag: {
            ...baseFlag,
            type: 'identifier',
            enabled: true,
            identifiers: ['user-1', 'user-2'],
          },
          identifier: 'user-1',
        },
      });
      expect(result).toBe(true);
    });

    it('returns false when identifier is not in the list', () => {
      const result = evaluateFlagCommand({
        dependencies: {},
        params: {
          flag: { ...baseFlag, type: 'identifier', enabled: true, identifiers: ['user-2'] },
          identifier: 'user-1',
        },
      });
      expect(result).toBe(false);
    });

    it('returns false when no identifier is provided', () => {
      const result = evaluateFlagCommand({
        dependencies: {},
        params: {
          flag: { ...baseFlag, type: 'identifier', enabled: true, identifiers: ['user-1'] },
        },
      });
      expect(result).toBe(false);
    });
  });

  describe('when the flag type is unknown', () => {
    it('returns false', () => {
      const result = evaluateFlagCommand({
        dependencies: {},
        params: { flag: { ...baseFlag, type: 'unknown' as never } },
      });
      expect(result).toBe(false);
    });
  });
});
