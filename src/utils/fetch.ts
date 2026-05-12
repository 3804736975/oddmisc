import { UmamiTimeoutError } from '../errors';

const DEFAULT_TIMEOUT = 10000;

export async function fetchWithTimeout(url: string, options?: RequestInit, timeout = DEFAULT_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new UmamiTimeoutError(`请求超时 (${timeout}ms): ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
