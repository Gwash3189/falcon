import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TtlCache } from '../cache.js';

describe('TtlCache', () => {
  it('returns undefined for a key that has never been set', () => {
    const cache = new TtlCache<string>(1000);
    expect(cache.get('missing')).toBeUndefined();
  });

  it('returns the stored value for a key that was set', () => {
    const cache = new TtlCache<string>(1000);
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });

  it('overwrites an existing key with a new value', () => {
    const cache = new TtlCache<string>(1000);
    cache.set('key', 'first');
    cache.set('key', 'second');
    expect(cache.get('key')).toBe('second');
  });

  it('deletes a key explicitly', () => {
    const cache = new TtlCache<string>(1000);
    cache.set('key', 'value');
    cache.delete('key');
    expect(cache.get('key')).toBeUndefined();
  });

  it('silently ignores deleting a key that does not exist', () => {
    const cache = new TtlCache<string>(1000);
    expect(() => cache.delete('nonexistent')).not.toThrow();
  });

  it('clears all entries', () => {
    const cache = new TtlCache<string>(1000);
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });

  it('stores boolean values correctly', () => {
    const cache = new TtlCache<boolean>(1000);
    cache.set('on', true);
    cache.set('off', false);
    expect(cache.get('on')).toBe(true);
    expect(cache.get('off')).toBe(false);
  });

  describe('when TTL is configured', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('returns undefined after the TTL has elapsed', () => {
      const cache = new TtlCache<string>(500);
      cache.set('key', 'value');
      vi.advanceTimersByTime(501);
      expect(cache.get('key')).toBeUndefined();
    });

    it('returns the value before the TTL has elapsed', () => {
      const cache = new TtlCache<string>(500);
      cache.set('key', 'value');
      vi.advanceTimersByTime(499);
      expect(cache.get('key')).toBe('value');
    });
  });
});
