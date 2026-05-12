import { describe, it, expect } from 'vitest';
import { UmamiError, UmamiUrlError, UmamiAuthError, UmamiNetworkError, UmamiTimeoutError } from '../src/errors';

describe('Custom Errors', () => {
  it('UmamiError should have correct properties', () => {
    const error = new UmamiError('test message', 'TEST_CODE', 500);
    expect(error.message).toBe('test message');
    expect(error.code).toBe('TEST_CODE');
    expect(error.status).toBe(500);
    expect(error.name).toBe('UmamiError');
  });

  it('UmamiUrlError should have INVALID_URL code', () => {
    const error = new UmamiUrlError('bad url');
    expect(error.code).toBe('INVALID_URL');
    expect(error.status).toBeUndefined();
    expect(error.name).toBe('UmamiUrlError');
  });

  it('UmamiAuthError should have AUTH_FAILED code', () => {
    const error = new UmamiAuthError('auth failed', 401);
    expect(error.code).toBe('AUTH_FAILED');
    expect(error.status).toBe(401);
    expect(error.name).toBe('UmamiAuthError');
  });

  it('UmamiNetworkError should have NETWORK_ERROR code', () => {
    const error = new UmamiNetworkError('network error', 503);
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.status).toBe(503);
    expect(error.name).toBe('UmamiNetworkError');
  });

  it('UmamiTimeoutError should have TIMEOUT code and default message', () => {
    const error = new UmamiTimeoutError();
    expect(error.code).toBe('TIMEOUT');
    expect(error.status).toBeUndefined();
    expect(error.name).toBe('UmamiTimeoutError');
    expect(error.message).toBe('请求超时');
  });

  it('UmamiTimeoutError should accept custom message', () => {
    const error = new UmamiTimeoutError('自定义超时');
    expect(error.message).toBe('自定义超时');
    expect(error.code).toBe('TIMEOUT');
  });

  it('all errors should be instances of Error and UmamiError', () => {
    expect(new UmamiUrlError('test')).toBeInstanceOf(Error);
    expect(new UmamiUrlError('test')).toBeInstanceOf(UmamiError);
    expect(new UmamiAuthError('test')).toBeInstanceOf(Error);
    expect(new UmamiNetworkError('test')).toBeInstanceOf(Error);
    expect(new UmamiTimeoutError()).toBeInstanceOf(Error);
    expect(new UmamiTimeoutError()).toBeInstanceOf(UmamiError);
  });
});
