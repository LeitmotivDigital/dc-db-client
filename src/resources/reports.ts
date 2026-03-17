import type { HttpClient, PaginatedList } from '../http.js';
import type {
  DataCenterReport,
  ReportCreate,
  ReportUpdate,
  ReportListParams,
  GlobalReportListParams,
} from '../types.js';

/** Reports scoped to a specific data center */
export class DataCenterReportsResource {
  private basePath: string;

  constructor(private http: HttpClient, dataCenterId: string) {
    this.basePath = `/api/v1/data-centers/${dataCenterId}/reports`;
  }

  /** List all reports for this data center */
  async list(
    params?: ReportListParams
  ): Promise<PaginatedList<DataCenterReport>> {
    return this.http.getPaginated<DataCenterReport>(this.basePath, params as Record<string, unknown>);
  }

  /** Get a single report by ID */
  async get(reportId: string): Promise<DataCenterReport> {
    return this.http.get<DataCenterReport>(`${this.basePath}/${reportId}`);
  }

  /** Submit a new report */
  async create(data: ReportCreate): Promise<DataCenterReport> {
    return this.http.post<DataCenterReport>(this.basePath, data);
  }

  /** Update an existing report (owner or admin only) */
  async update(
    reportId: string,
    data: ReportUpdate
  ): Promise<DataCenterReport> {
    return this.http.put<DataCenterReport>(
      `${this.basePath}/${reportId}`,
      data
    );
  }

  /** Delete a report (owner or admin only) */
  async delete(reportId: string): Promise<void> {
    return this.http.delete(`${this.basePath}/${reportId}`);
  }
}

/** Global reports endpoint (cross-DC listing) */
export class ReportsResource {
  constructor(private http: HttpClient) {}

  /** List reports across all data centers */
  async list(
    params?: GlobalReportListParams
  ): Promise<PaginatedList<DataCenterReport>> {
    return this.http.getPaginated<DataCenterReport>(
      '/api/v1/reports',
      params as Record<string, unknown>
    );
  }
}
