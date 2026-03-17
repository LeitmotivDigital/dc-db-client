import type { HttpClient } from '../http.js';
import type { ApiKey, ApiKeyWithSecret, ApiKeyCreate } from '../types.js';

export class ApiKeysResource {
  constructor(private http: HttpClient) {}

  /** Create a new API key (admin only). The raw key is only returned once. */
  async create(params: ApiKeyCreate): Promise<ApiKeyWithSecret> {
    return this.http.post<ApiKeyWithSecret>('/api/v1/api-keys', params);
  }

  /** List all API keys (admin only). Returns metadata only, never the key or hash. */
  async list(): Promise<ApiKey[]> {
    return this.http.get<ApiKey[]>('/api/v1/api-keys');
  }

  /** Deactivate an API key (admin only). Sets active=false rather than deleting. */
  async delete(id: string): Promise<void> {
    return this.http.delete(`/api/v1/api-keys/${id}`);
  }
}
