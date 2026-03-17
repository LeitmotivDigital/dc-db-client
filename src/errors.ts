export class ApiError extends Error {
  constructor(
    public status: number,
    public error: string,
    public details?: unknown
  ) {
    super(error);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(error: string, details?: unknown) {
    super(400, error, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(error: string = 'Missing or invalid API key') {
    super(401, error);
    this.name = 'AuthenticationError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(error: string = 'Insufficient permissions') {
    super(403, error);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApiError {
  constructor(error: string = 'Resource not found') {
    super(404, error);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApiError {
  constructor(error: string, details?: unknown) {
    super(409, error, details);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends ApiError {
  constructor(error: string = 'Rate limit exceeded') {
    super(429, error);
    this.name = 'RateLimitError';
  }
}
