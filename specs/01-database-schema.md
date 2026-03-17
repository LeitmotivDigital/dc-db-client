# Spec 01: Database Schema Changes

## Prerequisites

None. This is the foundation — all other specs depend on it.

## Current State

Three tables exist:
- `data_centers` - Master records with facility, power, cooling, location data + flags (missing, corrected, dismissed)
- `data_center_annual_reports` - Annual metrics (energy, water, servers, etc.) with no source tracking
- `notes` - Key-value store for dashboard section annotations

## New/Modified Tables

### 1. `api_keys` (NEW)

Stores API keys for external access and attribution.

```sql
CREATE TABLE api_keys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Key storage (only store hash; return raw key once on creation)
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix VARCHAR(8) NOT NULL,  -- first 8 chars for identification (e.g., "rvo_dk3m")

  -- Owner information
  organization_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  description TEXT,

  -- Permissions
  is_admin BOOLEAN DEFAULT FALSE,  -- admin keys can manage other keys

  -- Lifecycle
  active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(active) WHERE active = true;
```

**Notes:**
- Raw API key is shown only once at creation time (format: `rvo_<random32chars>`)
- `key_prefix` enables identifying keys without exposing the full hash
- `is_admin` allows a bootstrap key (e.g., for the dashboard itself) to manage the system
- The dashboard's own internal operations use a system API key
- All v1 API routes use the Supabase **service role key** for database access (bypasses RLS), since authorization is handled in application code

### 2. `data_centers` (MODIFIED)

Add `created_by` for attribution on externally-created records. Existing records get attributed to a system/bootstrap API key.

```sql
ALTER TABLE data_centers
  ADD COLUMN created_by UUID REFERENCES api_keys(id),
  ADD COLUMN updated_by UUID REFERENCES api_keys(id);
```

No other changes to data_centers. It remains the master record.

### 3. `data_center_reports` (REPLACES `data_center_annual_reports`)

Rename and extend with source tracking and attribution.

```sql
-- Source type enum
CREATE TYPE report_source_type AS ENUM (
  'eed',              -- EU Energy Efficiency Directive mandatory reporting
  'company',          -- Voluntary disclosure from DC operator
  'third_party',      -- Third-party audit or research
  'government',       -- Government/regulatory data
  'manual'            -- Manual entry by dashboard operators
);

ALTER TABLE data_center_annual_reports RENAME TO data_center_reports;

ALTER TABLE data_center_reports
  ADD COLUMN source_type report_source_type NOT NULL DEFAULT 'eed',
  ADD COLUMN source_name VARCHAR(255),           -- e.g., "RVO EED 2024", "Equinix Annual Report"
  ADD COLUMN submitted_by UUID REFERENCES api_keys(id),
  ADD COLUMN notes TEXT;

-- Update unique constraint: allow multiple sources per DC per year
ALTER TABLE data_center_reports
  DROP CONSTRAINT data_center_annual_reports_data_center_id_reporting_year_key;

ALTER TABLE data_center_reports
  ADD CONSTRAINT uq_reports_dc_year_source
  UNIQUE(data_center_id, reporting_year, source_type, submitted_by);

CREATE INDEX idx_reports_source_type ON data_center_reports(source_type);
CREATE INDEX idx_reports_submitted_by ON data_center_reports(submitted_by);
```

**Notes:**
- `source_type` classifies the origin of the data
- `source_name` is a human-readable label (e.g., "RVO EED Dataset 2024")
- `submitted_by` links to the API key that submitted the report
- Existing data will be migrated with `source_type = 'eed'` and attributed to the system key
- The unique constraint now allows multiple reports per DC per year from different sources

### 4. `data_center_estimations` (NEW)

Stores persisted estimation snapshots. Each row is one estimation run for one data center.

```sql
CREATE TABLE data_center_estimations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  data_center_id UUID NOT NULL REFERENCES data_centers(id) ON DELETE CASCADE,

  -- Estimation metadata
  estimation_source VARCHAR(255) NOT NULL,  -- e.g., "rvo-dashboard", "external-model-v2"
  estimation_version VARCHAR(50),            -- version of the estimation algorithm
  created_by UUID REFERENCES api_keys(id),

  -- Which report was used as input (if any)
  based_on_report_id UUID REFERENCES data_center_reports(id) ON DELETE SET NULL,

  -- Assumptions snapshot (stored as JSONB for flexibility)
  assumptions JSONB NOT NULL,
  -- Expected structure:
  -- {
  --   "powerDensityBefore2000": 1,
  --   "powerDensityBetween2000And2020": 4,
  --   "powerDensityAfter2020": 8,
  --   "sqmPerRack": 4,
  --   "defaultPue": 1.6,
  --   "utilizationRate": 50,
  --   "itSpaceRatio": 70,
  --   "serverPowerConsumption": 1,
  --   "serverManufacturingGwp": 1365.0,
  --   "emissionFactorGramsCO2PerKwh": 256,
  --   "heatReuseEfficiency": 90
  -- }

  -- Estimation flags: what was estimated vs what came from actual data
  estimation_flags JSONB,
  -- Expected structure:
  -- {
  --   "capacity": { "hadMissingFloorSpace": true, "hadMissingItFloorSpace": false, ... },
  --   "report": { "hadMissingTotalServers": true, ... }
  -- }

  -- Estimated capacity values
  estimated_floor_space_sqm DECIMAL(12, 2),
  estimated_it_floor_space_sqm DECIMAL(12, 2),
  estimated_total_power_capacity_kw DECIMAL(12, 3),
  estimated_it_power_capacity_kw DECIMAL(12, 3),

  -- Estimated annual values
  reporting_year INTEGER,
  estimated_total_energy_consumption_kwh DECIMAL(15, 2),
  estimated_it_energy_consumption_kwh DECIMAL(15, 2),
  estimated_total_servers INTEGER,

  -- Derived metrics (computed from estimated values + constants)
  estimated_pue DECIMAL(4, 2),
  estimated_wue DECIMAL(6, 4),
  estimated_grid_emissions_tonnes DECIMAL(15, 2),
  estimated_server_manufacturing_gwp_kg DECIMAL(15, 2),
  estimated_water_consumption_liters DECIMAL(15, 2),
  estimated_water_withdrawal_liters DECIMAL(15, 2),

  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- No updated_at: estimations are immutable snapshots
  -- To "update" an estimation, create a new one

  CONSTRAINT check_reporting_year CHECK (reporting_year > 1990 AND reporting_year <= 2100)
);

CREATE INDEX idx_estimations_dc ON data_center_estimations(data_center_id);
CREATE INDEX idx_estimations_dc_latest ON data_center_estimations(data_center_id, created_at DESC);
CREATE INDEX idx_estimations_source ON data_center_estimations(estimation_source);
CREATE INDEX idx_estimations_created_by ON data_center_estimations(created_by);
CREATE INDEX idx_estimations_year ON data_center_estimations(reporting_year);
```

**Notes:**
- Estimations are **append-only** (immutable). No UPDATE trigger needed.
- `assumptions` is JSONB so the schema can evolve without migrations.
- `estimation_flags` records which values were actually estimated vs derived from real data, preserving the current `_estimationFlags` behavior.
- `based_on_report_id` links to the specific report used as input, enabling traceability, optional.
- `estimation_source` differentiates between the dashboard's built-in model and external estimation providers.
- Derived metrics (emissions, water, WUE, etc.) are stored alongside capacity/energy estimates so stats endpoints don't need to recompute them.

### 5. View: `latest_estimations` (NEW)

A convenience view that returns only the most recent estimation per data center.

```sql
CREATE VIEW latest_estimations AS
SELECT DISTINCT ON (data_center_id)
  *
FROM data_center_estimations
ORDER BY data_center_id, created_at DESC;
```

This view simplifies queries in the stats endpoints: instead of joining and filtering for the latest, they just query `latest_estimations`.

## Entity Relationship Summary

```
api_keys
  |
  |--- created_by ---> data_centers (master)
  |                        |
  |                        |--- data_center_reports (sourced annual data)
  |                        |       - source_type, source_name
  |                        |       - submitted_by ---> api_keys
  |                        |
  |                        |--- data_center_estimations (computed snapshots)
  |                                - estimation_source, assumptions (JSONB)
  |                                - created_by ---> api_keys
  |                                - based_on_report_id ---> data_center_reports
  |
  |--- submitted_by ---> data_center_reports
  |--- created_by ----> data_center_estimations
```

## Migration Order

1. Create `api_keys` table + bootstrap system key
2. Add `created_by`/`updated_by` to `data_centers`
3. Rename `data_center_annual_reports` -> `data_center_reports` + add columns
4. Create `data_center_estimations` table
5. Create `latest_estimations` view
6. Backfill existing data with system key attribution and `source_type = 'eed'`
7. Regenerate Supabase TypeScript types
