import type { HttpClient, PaginatedList } from '../http.js';
import type {
  DataCenter,
  DataCenterDetail,
  DataCenterCreate,
  DataCenterUpdate,
  DataCenterListParams,
} from '../types.js';
import { DataCenterReportsResource } from './reports.js';
import { DataCenterEstimationsResource } from './estimations.js';

export class DataCentersResource {
  constructor(private http: HttpClient) {}

  /**
   * List all data centers with optional filtering and pagination.
   *
   * Pass `include` to embed associated data in each row, e.g.
   * `list({ include: ['sources', 'tags'] })`. Without it the rows carry the
   * data center's own columns only.
   */
  async list(
    params?: DataCenterListParams
  ): Promise<PaginatedList<DataCenter>> {
    const { include, ...rest } = params ?? {};
    return this.http.getPaginated<DataCenter>('/api/v1/data-centers', {
      ...rest,
      include: Array.isArray(include) ? include.join(',') : include,
    });
  }

  /**
   * Get a single data center by ID. The response carries every column, all
   * associated data (notes, sources, tenants, tags, updates), plus the latest
   * reports and the latest estimation.
   */
  async get(id: string): Promise<DataCenterDetail> {
    return this.http.get<DataCenterDetail>(`/api/v1/data-centers/${id}`);
  }

  /** Create a new data center */
  async create(data: DataCenterCreate): Promise<DataCenter> {
    return this.http.post<DataCenter>('/api/v1/data-centers', data);
  }

  /** Update an existing data center (owner or admin only) */
  async update(id: string, data: DataCenterUpdate): Promise<DataCenter> {
    return this.http.put<DataCenter>(`/api/v1/data-centers/${id}`, data);
  }

  /** Delete a data center (owner or admin only) */
  async delete(id: string): Promise<void> {
    return this.http.delete(`/api/v1/data-centers/${id}`);
  }

  /** Access reports for a specific data center */
  reports(dataCenterId: string): DataCenterReportsResource {
    return new DataCenterReportsResource(this.http, dataCenterId);
  }

  /** Access estimations for a specific data center */
  estimations(dataCenterId: string): DataCenterEstimationsResource {
    return new DataCenterEstimationsResource(this.http, dataCenterId);
  }
}
