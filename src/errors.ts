export class UmamiError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(message: string, code: string, status?: number) {
    super(message);
    this.name = 'UmamiError';
    this.code = code;
    this.status = status;
  }
}

export class UmamiUrlError extends UmamiError {
  constructor(message: string) {
    super(message, 'INVALID_URL');
    this.name = 'UmamiUrlError';
  }
}

export class UmamiAuthError extends UmamiError {
  constructor(message: string, status?: number) {
    super(message, 'AUTH_FAILED', status);
    this.name = 'UmamiAuthError';
  }
}

export class UmamiNetworkError extends UmamiError {
  constructor(message: string, status?: number) {
    super(message, 'NETWORK_ERROR', status);
    this.name = 'UmamiNetworkError';
  }
}

export class UmamiTimeoutError extends UmamiError {
  constructor(message = '请求超时') {
    super(message, 'TIMEOUT');
    this.name = 'UmamiTimeoutError';
  }
}
