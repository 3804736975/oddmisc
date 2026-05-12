import { describe, it, expect, vi } from 'vitest';
import { CacheManager } from '../src/utils/umami/cache';

describe('CacheManager LRU eviction', () => {
  it('evicts oldest entries when maxEntries is exceeded', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    const cache = new CacheManager('evict-test', 3600000, 3);
    cache.clear();

    vi.setSystemTime(new Date('2024-01-01T00:00:01Z'));
    cache.set('a', 'alpha');
    vi.setSystemTime(new Date('2024-01-01T00:00:02Z'));
    cache.set('b', 'bravo');
    vi.setSystemTime(new Date('2024-01-01T00:00:03Z'));
    cache.set('c', 'charlie');

    // All 3 should exist
    expect(cache.get('a')).toBe('alpha');
    expect(cache.get('b')).toBe('bravo');
    expect(cache.get('c')).toBe('charlie');

    // Adding 4th should evict the oldest (a)
    vi.setSystemTime(new Date('2024-01-01T00:00:04Z'));
    cache.set('d', 'delta');

    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).toBe('bravo');
    expect(cache.get('c')).toBe('charlie');
    expect(cache.get('d')).toBe('delta');

    vi.useRealTimers();
  });

  it('does not evict when under maxEntries', () => {
    const cache = new CacheManager('no-evict', 3600000, 10);
    cache.clear();

    cache.set('x', 1);
    cache.set('y', 2);
    cache.set('z', 3);

    expect(cache.get('x')).toBe(1);
    expect(cache.get('y')).toBe(2);
    expect(cache.get('z')).toBe(3);
  });
});
