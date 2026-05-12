import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchWithTimeout } from '../src/utils/fetch';
import { UmamiTimeoutError } from '../src/errors';

describe('fetchWithTimeout', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns the response on success', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: 1 })
    } as unknown as Response)) as unknown as typeof fetch;

    const res = await fetchWithTimeout('https://example.com');
    expect(res.ok).toBe(true);
  });

  it('throws UmamiTimeoutError when request times out', async () => {
    vi.useFakeTimers();

    globalThis.fetch = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new DOMException('The operation was aborted.', 'AbortError');
          reject(err);
        });
      });
    }) as unknown as typeof fetch;

    const promise = fetchWithTimeout('https://example.com', undefined, 100);
    vi.advanceTimersByTime(150);

    await expect(promise).rejects.toBeInstanceOf(UmamiTimeoutError);

    vi.useRealTimers();
  });

  it('passes options through to fetch', async () => {
    const mockFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
    } as unknown as Response));
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    await fetchWithTimeout('https://example.com', {
      headers: { 'X-Custom': 'value' }
    });

    const [, options] = mockFetch.mock.calls[0];
    expect((options as RequestInit).headers).toEqual({ 'X-Custom': 'value' });
    expect((options as RequestInit).signal).toBeDefined();
  });
});
