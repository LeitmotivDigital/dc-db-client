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

  /** List all data centers with optional filtering and pagination */
  async list(
    params?: DataCenterListParams
  ): Promise<PaginatedList<DataCenter>> {
    return this.http.getPaginated<DataCenter>(
      '/api/v1/data-centers',
      params as Record<string, unknown>
    );
  }

  /** Get a single data center by ID, including latest reports and estimation */
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
