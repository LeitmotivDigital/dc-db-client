import axios, { AxiosInstance, AxiosError } from 'axios';
import type { ClientConfig, PaginationInfo } from './types.js';
import {
  ApiError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
} from './errors.js';

export interface PaginatedList<T> {
  data: T[];
  pagination: PaginationInfo;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export class HttpClient {
  private axios: AxiosInstance;

  constructor(config: ClientConfig) {
    this.axios = axios.create({
      baseURL: config.baseUrl.replace(/\/+$/, ''),
      timeout: config.timeout ?? 30_000,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    this.axios.interceptors.response.use(undefined, (error: AxiosError) => {
      if (!error.response) {
        throw new ApiError(0, error.message ?? 'Network error');
      }

      const { status, data } = error.response;
      const body = data as { error?: string; details?: unknown } | undefined;
      const message = body?.error ?? error.message ?? 'Unknown error';
      const details = body?.details;

      switch (status) {
        case 400:
          throw new ValidationError(message, details);
        case 401:
          throw new AuthenticationError(message);
        case 403:
          throw new ForbiddenError(message);
        case 404:
          throw new NotFoundError(message);
        case 409:
          throw new ConflictError(message, details);
        case 429:
          throw new RateLimitError(message);
        default:
          throw new ApiError(status, message, details);
      }
    });
  }

  async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.axios.get(path, {
      params: stripUndefined(params),
    });
    return response.data.data as T;
  }

  async getPaginated<T>(
    path: string,
    params?: Record<string, unknown>
  ): Promise<PaginatedList<T>> {
    const response = await this.axios.get(path, {
      params: stripUndefined(params),
    });
    const { data, pagination } = response.data as {
      data: T[];
      pagination: PaginationInfo;
    };
    return {
      data,
      pagination,
      hasNextPage: pagination.page < pagination.total_pages,
      hasPrevPage: pagination.page > 1,
    };
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const response = await this.axios.post(path, body);
    return response.data.data as T;
  }

  async postRaw<T>(path: string, body?: unknown): Promise<T> {
    const response = await this.axios.post(path, body);
    return response.data as T;
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    const response = await this.axios.put(path, body);
    return response.data.data as T;
  }

  async delete(path: string): Promise<void> {
    await this.axios.delete(path);
  }
}

function stripUndefined(
  obj?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!obj) return undefined;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}
