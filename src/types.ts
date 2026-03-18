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
  reported_data_center_type: string | null;
  operator_name: string | null;
  owner_name: string | null;
  owner_country: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  lau_code: string | null;
  latitude: number | null;
  longitude: number | null;
  campus_name: string | null;
  building_name: string | null;
  floor_space_sqm: number | null;
  it_floor_space_sqm: number | null;
  office_floor_space_sqm: number | null;
  total_power_capacity_kw: number | null;
  it_power_capacity_kw: number | null;
  utility_power_capacity_kw: number | null;
  design_pue: number | null;
  electrical_redundancy: string | null;
  electrical_redundancy_details: string | null;
  cooling_type: string | null;
  cooling_capacity_kw: number | null;
  cooling_redundancy: string | null;
  cooling_redundancy_details: string | null;
  refrigerant_type: string | null;
  water_usage_effectiveness_calc: number | null;
  backup_power_type: string | null;
  backup_power_capacity_kw: number | null;
  battery_capacity_grid_support_kw: number | null;
  tier_level: number | null;
  tier_certification_body: string | null;
  year_built: number | null;
  year_last_renovation: number | null;
  operational_status: string | null;
  commissioning_date: string | null;
  primary_energy_source: string | null;
  data_source: string | null;
  reporting_date: string | null;
  last_verified_date: string | null;
  override_density_power_kw_per_rack: number | null;
  missing: boolean;
  corrected: boolean;
  correction_note: string | null;
  dismissed: boolean | null;
  dismiss_reason: string | null;
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
  reported_data_center_type?: string;
  operator_name?: string;
  owner_name?: string;
  owner_country?: string;
  country?: string;
  region?: string;
  city?: string;
  address?: string;
  lau_code?: string;
  latitude?: number;
  longitude?: number;
  campus_name?: string;
  building_name?: string;
  floor_space_sqm?: number;
  it_floor_space_sqm?: number;
  office_floor_space_sqm?: number;
  total_power_capacity_kw?: number;
  it_power_capacity_kw?: number;
  utility_power_capacity_kw?: number;
  design_pue?: number;
  electrical_redundancy?: string;
  electrical_redundancy_details?: string;
  cooling_type?: string;
  cooling_capacity_kw?: number;
  cooling_redundancy?: string;
  cooling_redundancy_details?: string;
  refrigerant_type?: string;
  water_usage_effectiveness_calc?: number;
  backup_power_type?: string;
  backup_power_capacity_kw?: number;
  battery_capacity_grid_support_kw?: number;
  tier_level?: number;
  tier_certification_body?: string;
  year_built?: number;
  year_last_renovation?: number;
  operational_status?: string;
  commissioning_date?: string;
  primary_energy_source?: string;
  data_source?: string;
  reporting_date?: string;
  last_verified_date?: string;
  override_density_power_kw_per_rack?: number;
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
  cooling_energy_consumption_kwh: number | null;
  backup_generator_energy_kwh: number | null;
  total_renewable_energy_kwh: number | null;
  guarantees_of_origin_kwh: number | null;
  power_purchase_agreements_kwh: number | null;
  onsite_power_generation_kwh: number | null;
  total_water_input_m3: number | null;
  total_potable_water_m3: number | null;
  waste_heat_kwh: number | null;
  avg_waste_heat_temp_celsius: number | null;
  avg_setpoint_it_intake_celsius: number | null;
  cooling_degree_days: number | null;
  reported_pue: number | null;
  reported_utilization_percentage: number | null;
  total_servers: number | null;
  total_storage_petabyte: number | null;
  incoming_bandwidth_gbit: number | null;
  outgoing_bandwidth_gbit: number | null;
  incoming_traffic_volume_exabyte: number | null;
  outgoing_traffic_volume_exabyte: number | null;
  reported_incidents: number | null;
  reported_uptime_percentage: number | null;
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
  cooling_energy_consumption_kwh?: number;
  backup_generator_energy_kwh?: number;
  total_renewable_energy_kwh?: number;
  guarantees_of_origin_kwh?: number;
  power_purchase_agreements_kwh?: number;
  onsite_power_generation_kwh?: number;
  total_water_input_m3?: number;
  total_potable_water_m3?: number;
  waste_heat_kwh?: number;
  avg_waste_heat_temp_celsius?: number;
  avg_setpoint_it_intake_celsius?: number;
  cooling_degree_days?: number;
  reported_pue?: number;
  reported_utilization_percentage?: number;
  total_servers?: number;
  total_storage_petabyte?: number;
  incoming_bandwidth_gbit?: number;
  outgoing_bandwidth_gbit?: number;
  incoming_traffic_volume_exabyte?: number;
  outgoing_traffic_volume_exabyte?: number;
  reported_incidents?: number;
  reported_uptime_percentage?: number;
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
