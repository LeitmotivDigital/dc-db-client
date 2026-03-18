import type { HttpClient, PaginatedList } from '../http.js';
import type {
  DataCenterEstimation,
  EstimationCreate,
  EstimationBatchCreate,
  EstimationListParams,
  GlobalEstimationListParams,
  EstimationAggregates,
  BatchEstimationResult,
} from '../types.js';

/** Estimations scoped to a specific data center */
export class DataCenterEstimationsResource {
  private basePath: string;

  constructor(private http: HttpClient, dataCenterId: string) {
    this.basePath = `/api/v1/data-centers/${dataCenterId}/estimations`;
  }

  /** List estimations for this data center (newest first) */
  async list(
    params?: EstimationListParams
  ): Promise<PaginatedList<DataCenterEstimation>> {
    return this.http.getPaginated<DataCenterEstimation>(
      this.basePath,
      params as Record<string, unknown>
    );
  }

  /** Trigger an estimation for this data center */
  async create(data?: EstimationCreate): Promise<DataCenterEstimation> {
    return this.http.post<DataCenterEstimation>(this.basePath, data);
  }
}

/** Global estimations endpoints */
export class EstimationsResource {
  constructor(private http: HttpClient) {}

  /** List all estimations across data centers */
  async list(
    params?: GlobalEstimationListParams
  ): Promise<PaginatedList<DataCenterEstimation>> {
    return this.http.getPaginated<DataCenterEstimation>(
      '/api/v1/estimations',
      params as Record<string, unknown>
    );
  }

  /** Trigger estimations for multiple (or all) data centers */
  async batch(data?: EstimationBatchCreate): Promise<BatchEstimationResult> {
    return this.http.postRaw<BatchEstimationResult>(
      '/api/v1/estimations/batch',
      data
    );
  }

  /** Get pre-aggregated stats from latest estimations */
  async aggregates(params?: {
    year?: number;
  }): Promise<EstimationAggregates> {
    return this.http.get<EstimationAggregates>(
      '/api/v1/estimations/aggregates',
      params as Record<string, unknown>
    );
  }
}
