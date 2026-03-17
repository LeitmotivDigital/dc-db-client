import { HttpClient } from './http.js';
import type { ClientConfig } from './types.js';
import { ApiKeysResource } from './resources/api-keys.js';
import { DataCentersResource } from './resources/data-centers.js';
import { ReportsResource } from './resources/reports.js';
import { EstimationsResource } from './resources/estimations.js';

export class DataCenterClient {
  /** API key management (admin only) */
  public readonly apiKeys: ApiKeysResource;
  /** Data center CRUD with nested .reports() and .estimations() */
  public readonly dataCenters: DataCentersResource;
  /** Global reports listing across all data centers */
  public readonly reports: ReportsResource;
  /** Global estimations, batch triggers, and aggregates */
  public readonly estimations: EstimationsResource;

  constructor(config: ClientConfig) {
    const http = new HttpClient(config);
    this.apiKeys = new ApiKeysResource(http);
    this.dataCenters = new DataCentersResource(http);
    this.reports = new ReportsResource(http);
    this.estimations = new EstimationsResource(http);
  }
}
