// ── Client Configuration ─────────────────────────────────────────────

export interface ClientConfig {
  /** Base URL of the API server (e.g., "https://api.example.com") */
  baseUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

// ── Enums ────────────────────────────────────────────────────────────

export type DataCenterType =
  | 'Enterprise'
  | 'Government'
  | 'Regional'
  | 'Co-Location'
  | 'Hyperscale'
  | 'University';

export type ReportSourceType =
  | 'eed'
  | 'company'
  | 'third_party'
  | 'government'
  | 'manual';

// ── Pagination ───────────────────────────────────────────────────────

export interface PaginationInfo {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
}

// ── Data Centers ─────────────────────────────────────────────────────

export interface DataCenter {
  id: string;
  data_center_name: string;
  data_center_type: DataCenterType | null;
  operator_name: string | null;
  owner_name: string | null;
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  lau_code: string | null;
  operational_status: string | null;
  year_built: number | null;
  tier_level: number | null;
  design_pue: number | null;
  total_power_capacity_kw: number | null;
  it_power_capacity_kw: number | null;
  total_floor_space_sqm: number | null;
  it_floor_space_sqm: number | null;
  dismissed: boolean;
  corrected: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/** DataCenter with nested latest data (returned by GET /data-centers/:id) */
export interface DataCenterDetail extends DataCenter {
  latest_reports: DataCenterReport[];
  latest_estimation: DataCenterEstimation | null;
}

export interface DataCenterCreate {
  data_center_name: string;
  data_center_type?: DataCenterType;
  operator_name?: string;
  owner_name?: string;
  country?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  lau_code?: string;
  operational_status?: string;
  year_built?: number;
  tier_level?: number;
  design_pue?: number;
  total_power_capacity_kw?: number;
  it_power_capacity_kw?: number;
  total_floor_space_sqm?: number;
  it_floor_space_sqm?: number;
}

export type DataCenterUpdate = Partial<DataCenterCreate>;

export interface DataCenterListParams extends PaginationParams {
  country?: string;
  type?: DataCenterType;
  operator?: string;
  status?: string;
  dismissed?: boolean;
  corrected?: boolean;
  search?: string;
}

// ── Reports ──────────────────────────────────────────────────────────

export interface DataCenterReport {
  id: string;
  data_center_id: string;
  reporting_year: number;
  source_type: ReportSourceType;
  source_name: string | null;
  submitted_by: string | null;
  notes: string | null;
  total_energy_consumption_kwh: number | null;
  it_energy_consumption_kwh: number | null;
  total_renewable_energy_kwh: number | null;
  total_water_consumption_liters: number | null;
  total_water_withdrawal_liters: number | null;
  total_servers: number | null;
  pue: number | null;
  wue: number | null;
  created_at: string;
  updated_at: string;
}

export interface ReportCreate {
  reporting_year: number;
  source_type: ReportSourceType;
  source_name?: string;
  notes?: string;
  total_energy_consumption_kwh?: number;
  it_energy_consumption_kwh?: number;
  total_renewable_energy_kwh?: number;
  total_water_consumption_liters?: number;
  total_water_withdrawal_liters?: number;
  total_servers?: number;
  pue?: number;
  wue?: number;
}

export type ReportUpdate = Partial<ReportCreate>;

export interface ReportListParams extends PaginationParams {
  year?: number;
  source_type?: ReportSourceType;
}

export interface GlobalReportListParams extends ReportListParams {
  submitted_by?: string;
}

// ── Estimations ──────────────────────────────────────────────────────

export interface EstimationAssumptions {
  powerDensityBefore2000?: number;
  powerDensityBetween2000And2020?: number;
  powerDensityAfter2020?: number;
  sqmPerRack?: number;
  defaultPue?: number;
  utilizationRate?: number;
  itSpaceRatio?: number;
  serverPowerConsumption?: number;
  serverManufacturingGwp?: number;
  emissionFactorGramsCO2PerKwh?: number;
  heatReuseEfficiency?: number;
}

export interface EstimationFlags {
  capacity?: {
    hadMissingFloorSpace?: boolean;
    hadMissingItFloorSpace?: boolean;
    hadMissingTotalPowerCapacity?: boolean;
    hadMissingItPowerCapacity?: boolean;
  };
  report?: {
    hadMissingTotalServers?: boolean;
    hadMissingItEnergyConsumption?: boolean;
    hadMissingTotalEnergyConsumption?: boolean;
  };
}

export interface DataCenterEstimation {
  id: string;
  data_center_id: string;
  estimation_source: string;
  estimation_version: string | null;
  created_by: string | null;
  based_on_report_id: string | null;
  assumptions: EstimationAssumptions;
  estimation_flags: EstimationFlags | null;
  estimated_floor_space_sqm: number | null;
  estimated_it_floor_space_sqm: number | null;
  estimated_total_power_capacity_kw: number | null;
  estimated_it_power_capacity_kw: number | null;
  reporting_year: number | null;
  estimated_total_energy_consumption_kwh: number | null;
  estimated_it_energy_consumption_kwh: number | null;
  estimated_total_servers: number | null;
  estimated_pue: number | null;
  estimated_wue: number | null;
  estimated_grid_emissions_tonnes: number | null;
  estimated_server_manufacturing_gwp_kg: number | null;
  estimated_water_consumption_liters: number | null;
  estimated_water_withdrawal_liters: number | null;
  created_at: string;
}

export interface EstimationCreate {
  assumptions?: EstimationAssumptions;
  estimation_source?: string;
  estimation_version?: string;
  reporting_year?: number;
}

export interface EstimationBatchCreate extends EstimationCreate {
  data_center_ids?: string[];
}

export interface EstimationListParams extends PaginationParams {
  latest?: boolean;
  source?: string;
  year?: number;
}

export interface GlobalEstimationListParams extends EstimationListParams {
  data_center_id?: string;
}

export interface EstimationAggregates {
  data_centers_count: number;
  total_power_capacity_mw: number;
  it_power_capacity_mw: number;
  total_energy_consumption_twh: number;
  it_energy_consumption_twh: number;
  total_servers: number;
  average_pue: number;
  total_grid_emissions_tonnes: number;
  total_server_manufacturing_gwp_tonnes: number;
  total_water_consumption_m3: number;
  capacity_utilization_percent: number;
  average_density_kw_per_rack: number;
  reporting_year: number;
  estimation_count: number;
  latest_batch_at: string;
}

export interface BatchEstimationResult {
  created: number;
  skipped: number;
  errors: number;
  details: {
    skipped_ids: string[];
    error_ids: string[];
  };
}

// ── API Keys ─────────────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  key_prefix: string;
  organization_name: string;
  contact_email: string | null;
  description: string | null;
  is_admin: boolean;
  active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Returned only from create — includes the one-time raw key */
export interface ApiKeyWithSecret extends ApiKey {
  key: string;
}

export interface ApiKeyCreate {
  organization_name: string;
  contact_email?: string;
  description?: string;
  expires_at?: string;
}
