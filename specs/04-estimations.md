# Spec 04: Estimation Engine and Persisted Estimation Records

## Prerequisites

- [01-database-schema.md](./01-database-schema.md) — `data_center_estimations` table and `latest_estimations` view must exist
- [03-reports.md](./03-reports.md) — `resolved_reports` view must exist (used as estimation input)
- [05-api-and-auth.md](./05-api-and-auth.md) — API key auth middleware, service role client must be implemented

## Overview

Currently, estimation logic runs on every API request: each of the 30+ stats endpoints calls `fillMissingCapacityData()` and/or `fillMissingAnnualReportData()` to compute derived values in memory. This spec moves estimations to a persisted model: you *trigger* an estimation, it runs the existing logic, and stores the results in `data_center_estimations`. Dashboard and API consumers then read from the table.

## Current Estimation Logic (Preserved)

The existing code in `lib/capacity-estimation.ts` and `lib/report-estimation.ts` implements a well-defined estimation cascade:

### Capacity Estimation Cascade (`fillMissingCapacityData`)
```
Step 1: Floor space
  - If total floor space known, IT unknown → IT = total * (itSpaceRatio / 100)
  - If IT floor space known, total unknown → total = IT * (itSpaceRatio / 100 + 1)

Step 2: Power capacity
  - If total power known, IT unknown → IT = total * (utilizationRate / 100)
  - If IT power known, total unknown → total = IT * (utilizationRate / 100 + 1)
  - If neither power known but IT floor space known:
      → IT power = (IT floor / sqmPerRack) * powerDensity(year_built)
      → total power = IT power * (utilizationRate / 100 + 1)
  - If neither power known but total floor space known:
      → total power = (IT floor estimate / sqmPerRack) * powerDensity * PUE
      → IT power = total power * (utilizationRate / 100)
```

### Report Estimation Cascade (`fillMissingAnnualReportData`)
```
Prerequisites: Capacity data must be filled first.

Step 1: Total servers
  - If IT energy known → servers = IT energy / 8760 / serverPowerConsumption
  - Else → servers = IT power capacity / serverPowerConsumption

Step 2: IT energy consumption
  - If total energy known → IT energy = total energy / PUE
  - Else → IT energy = IT power * (utilizationRate / 100) * 8760

Step 3: Total energy consumption
  - If IT energy known → total energy = IT energy * PUE
```

### Derived Metrics (Currently in individual API routes)
```
Grid emissions     = total energy (kWh) * emissionFactor (g/kWh) / 1,000,000 → tonnes
Server mfg GWP     = servers * serverManufacturingGwp → kg
Water consumption   = total energy (kWh) * 3.44 → liters (WRI 2020)
Water withdrawal    = total energy (kWh) * 696.52 → liters (WRI 2020)
PUE                = total energy / IT energy
WUE                = (total water m3 * 1000) / IT energy kWh
```

## API Endpoints

### `POST /api/v1/data-centers/:data_center_id/estimations`

Trigger an estimation for a specific data center.

**Request Body (optional):**
```json
{
  "assumptions": {
    "powerDensityBefore2000": 1,
    "powerDensityBetween2000And2020": 4,
    "powerDensityAfter2020": 8,
    "sqmPerRack": 4,
    "defaultPue": 1.6,
    "utilizationRate": 50,
    "itSpaceRatio": 70,
    "serverPowerConsumption": 1,
    "serverManufacturingGwp": 1365.0,
    "emissionFactorGramsCO2PerKwh": 256,
    "heatReuseEfficiency": 90
  },
  "estimation_source": "rvo-dashboard",
  "estimation_version": "1.0.0",
  "reporting_year": 2024
}
```

If `assumptions` is omitted, `DEFAULT_ASSUMPTIONS` from `lib/estimation-constants.ts` are used.
If `reporting_year` is omitted, defaults to current year - 1.

**Process:**
1. Fetch the data center master record
2. Fetch the resolved report for the given year (see spec 03 report resolution)
3. Run `fillMissingCapacityData()` on the data center
4. Run `fillMissingAnnualReportData()` on the report (if exists) or create a synthetic report
5. Compute derived metrics (emissions, water, WUE, PUE, manufacturing GWP)
6. Store everything in `data_center_estimations` as a new row
7. Return the created estimation

**Response:** `201 Created`
```json
{
  "data": {
    "id": "uuid",
    "data_center_id": "uuid",
    "estimation_source": "rvo-dashboard",
    "estimation_version": "1.0.0",
    "assumptions": { ... },
    "estimation_flags": {
      "capacity": {
        "hadMissingFloorSpace": true,
        "hadMissingItFloorSpace": false,
        "hadMissingTotalPowerCapacity": true,
        "hadMissingItPowerCapacity": true
      },
      "report": {
        "hadMissingTotalServers": true,
        "hadMissingItEnergyConsumption": true,
        "hadMissingTotalEnergyConsumption": true
      }
    },
    "estimated_floor_space_sqm": 5000,
    "estimated_it_floor_space_sqm": 3500,
    "estimated_total_power_capacity_kw": 8960,
    "estimated_it_power_capacity_kw": 7000,
    "estimated_total_energy_consumption_kwh": 49156800,
    "estimated_it_energy_consumption_kwh": 30660000,
    "estimated_total_servers": 7000,
    "estimated_pue": 1.6,
    "estimated_grid_emissions_tonnes": 12.58,
    "estimated_server_manufacturing_gwp_kg": 9555000,
    "estimated_water_consumption_liters": 169099392,
    "estimated_water_withdrawal_liters": 34232654592,
    "reporting_year": 2024,
    "based_on_report_id": "uuid-or-null",
    "created_at": "2026-03-17T..."
  }
}
```

**Authorization:** Any valid API key. `created_by` is automatically set.

### `POST /api/v1/estimations/batch`

Trigger estimations for multiple (or all) data centers at once.

**Request Body:**
```json
{
  "data_center_ids": ["uuid1", "uuid2"],    // optional; omit to run for all
  "assumptions": { ... },                     // optional; uses defaults
  "estimation_source": "rvo-dashboard",
  "estimation_version": "1.0.0",
  "reporting_year": 2024
}
```

If `data_center_ids` is omitted, runs for all non-dismissed data centers that have at least some capacity or floor space data (same filter as current `fetchDataCentersForEstimation`).

**Response:** `202 Accepted` (for large batches) or `201 Created` (for small batches)
```json
{
  "created": 287,
  "skipped": 12,
  "errors": 3,
  "details": {
    "skipped_ids": ["uuid..."],     // DCs with no estimable data
    "error_ids": ["uuid..."]
  }
}
```

**Authorization:** Any valid API key.

### `GET /api/v1/data-centers/:data_center_id/estimations`

List estimations for a data center (newest first).

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `latest` | boolean | If true, return only the latest estimation |
| `source` | string | Filter by estimation_source |
| `year` | number | Filter by reporting_year |
| `page` | number | Page number |
| `per_page` | number | Items per page |

**Authorization:** Any valid API key.

### `GET /api/v1/estimations`

List all estimations across data centers (for aggregate views).

**Query Parameters:** Same as above, plus `data_center_id` filter.

**Authorization:** Any valid API key.

### `GET /api/v1/estimations/aggregates`

Get pre-aggregated stats from latest estimations. This replaces the current 30+ individual stats endpoints for estimated data.

**Response:**
```json
{
  "data_centers_count": 342,
  "total_power_capacity_mw": 4521.3,
  "it_power_capacity_mw": 2830.8,
  "total_energy_consumption_twh": 12.4,
  "it_energy_consumption_twh": 7.75,
  "total_servers": 1250000,
  "average_pue": 1.6,
  "total_grid_emissions_tonnes": 3174400,
  "total_server_manufacturing_gwp_tonnes": 1706250,
  "total_water_consumption_m3": 42658000,
  "capacity_utilization_percent": 62.6,
  "average_density_kw_per_rack": 5.2,
  "reporting_year": 2024,
  "estimation_count": 287,
  "latest_batch_at": "2026-03-17T..."
}
```

## Estimation Engine Implementation

### New Module: `lib/estimation-engine.ts`

This module orchestrates the full estimation pipeline for a single data center:

```typescript
// Pseudocode structure
export async function runEstimation(
  dataCenterId: string,
  options: {
    assumptions?: EstimationParams,
    reportingYear?: number,
    estimationSource?: string,
    estimationVersion?: string,
    createdBy?: string  // API key ID
  }
): Promise<DataCenterEstimation> {
  // 1. Fetch DC master record
  // 2. Fetch resolved report for the year
  // 3. Run capacity estimation (reuse fillMissingCapacityData)
  // 4. Run report estimation (reuse fillMissingAnnualReportData)
  // 5. Compute derived metrics
  // 6. Build estimation record
  // 7. Insert into data_center_estimations
  // 8. Return the record
}
```

This reuses the existing functions from `capacity-estimation.ts` and `report-estimation.ts` - they remain the source of truth for the estimation math. The engine just wraps them with persistence.

### Derived Metric Computation

Currently scattered across individual API routes, these formulas should be centralized in a new utility:

```typescript
// lib/derived-metrics.ts
export function computeDerivedMetrics(params: {
  totalEnergyKwh: number,
  itEnergyKwh: number,
  totalServers: number,
  totalWaterM3: number | null,
  assumptions: { emissionFactorGramsCO2PerKwh: number, serverManufacturingGwp: number }
}): DerivedMetrics {
  return {
    pue: totalEnergyKwh / itEnergyKwh,
    gridEmissionsTonnes: (totalEnergyKwh * assumptions.emissionFactorGramsCO2PerKwh) / 1_000_000,
    serverManufacturingGwpKg: totalServers * assumptions.serverManufacturingGwp,
    waterConsumptionLiters: totalEnergyKwh * 3.44,      // WRI 2020
    waterWithdrawalLiters: totalEnergyKwh * 696.52,      // WRI 2020
    wue: totalWaterM3 ? (totalWaterM3 * 1000) / itEnergyKwh : null,
  }
}
```

## Impact on Existing Stats Endpoints

Once estimations are persisted, the current stats endpoints simplify dramatically. Instead of:

```typescript
// Current pattern (repeated in 30+ routes)
const useAssumptions = searchParams.get('assumptions') === '1'
if (useAssumptions) {
  const filledReports = await fetchAndFillAnnualReportData(assumptions)
  const estimated = calculateEstimatedTotalEnergyConsumption(filledReports)
  total += estimated
}
```

They become:

```typescript
// New pattern
const useEstimations = searchParams.get('assumptions') === '1'
if (useEstimations) {
  const { data } = await supabase
    .from('latest_estimations')
    .select('estimated_total_energy_consumption_kwh')
  total += data.reduce((sum, e) => sum + (e.estimated_total_energy_consumption_kwh || 0), 0)
}
```

This is a major simplification. However, the migration should be done incrementally - see spec 06.

## Dashboard Integration

### Assumptions Form Behavior Change

Currently, changing assumptions triggers SWR cache invalidation and all stats re-fetch with new parameters. With persisted estimations:

1. User adjusts assumptions in the form
2. Dashboard calls `POST /api/v1/estimations/batch` with the new assumptions
3. Batch estimation runs (may take a few seconds for 300+ DCs)
4. Dashboard receives confirmation and invalidates SWR caches
5. Stats endpoints read from the newly created estimations

This means assumption changes are slightly slower but produce auditable, persistent results.

**Alternative (recommended for v1):** Keep the current behavior for the dashboard's interactive assumption tuning (compute on-the-fly for responsiveness), but also persist the "official" estimation set when the user confirms/saves their assumptions. This gives the best of both worlds: responsive UI + persistent records.

## File Structure

```
lib/
  estimation-engine.ts       -- Orchestrates estimation pipeline
  derived-metrics.ts         -- Centralized derived metric formulas
  capacity-estimation.ts     -- (existing, unchanged)
  report-estimation.ts       -- (existing, unchanged)
  estimation-constants.ts    -- (existing, unchanged)

app/api/v1/
  data-centers/
    [data_center_id]/
      estimations/
        route.ts             -- GET (list), POST (trigger single)
  estimations/
    route.ts                 -- GET (list all)
    batch/
      route.ts               -- POST (trigger batch)
    aggregates/
      route.ts               -- GET (pre-aggregated stats)
```
