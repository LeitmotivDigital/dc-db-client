# Spec 03: Report Submission with Source Attribution

## Prerequisites

- [01-database-schema.md](./01-database-schema.md) — `data_center_reports` table (renamed from `data_center_annual_reports`) with source columns and `resolved_reports` view must exist
- [05-api-and-auth.md](./05-api-and-auth.md) — API key auth middleware, service role client, pagination and validation utilities must be implemented

## Overview

Reports are annual data submissions about a data center's operations (energy, water, servers, etc.). The current `data_center_annual_reports` table is renamed to `data_center_reports` and extended with source tracking so we know *where* each data point came from.

## Current State

- `data_center_annual_reports` has a UNIQUE constraint on `(data_center_id, reporting_year)` - only one report per DC per year
- All data comes from a single source (RVO/EED import)
- No attribution of who submitted the data
- Reports are imported via `scripts/import-rvo-data.js`

## Key Change: Multiple Reports per DC per Year

The unique constraint changes from `(data_center_id, reporting_year)` to `(data_center_id, reporting_year, source_type, submitted_by)`. This means:

- The EED can submit a report for DC X for 2024
- The DC operator can also submit their own report for DC X for 2024
- A third-party auditor can submit yet another report

When computing aggregates or running estimations, the system needs a **report resolution strategy** to decide which report to use when multiple exist. See "Report Resolution" below.

## API Endpoints

All endpoints live under `/app/api/v1/data-centers/:data_center_id/reports/`.

### `GET /api/v1/data-centers/:data_center_id/reports`

List all reports for a data center.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `year` | number | Filter by reporting_year |
| `source_type` | string | Filter by source_type enum |
| `page` | number | Page number (default: 1) |
| `per_page` | number | Items per page (default: 50) |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "data_center_id": "uuid",
      "reporting_year": 2024,
      "source_type": "eed",
      "source_name": "RVO EED Dataset 2024",
      "submitted_by": "uuid",
      "total_energy_consumption_kwh": 52000000,
      ...other_fields
    }
  ],
  "pagination": { ... }
}
```

**Authorization:** Any valid API key (read-all).

### `GET /api/v1/data-centers/:data_center_id/reports/:id`

Get a single report by ID.

**Authorization:** Any valid API key.

### `POST /api/v1/data-centers/:data_center_id/reports`

Submit a new report.

**Request Body:**
```json
{
  "reporting_year": 2024,
  "source_type": "company",
  "source_name": "Equinix Annual Sustainability Report 2024",
  "total_energy_consumption_kwh": 52000000,
  "it_energy_consumption_kwh": 32000000,
  "total_renewable_energy_kwh": 40000000,
  ...optional_fields
}
```

**Required fields:** `reporting_year`, `source_type`
**Optional fields:** All metric columns. Callers submit only the data they have; null fields are left null.

**Response:** `201 Created` with the created report.

**Authorization:** Any valid API key. `submitted_by` is automatically set.

**Side effect:** After a report is created, the system should flag that the data center's estimations may be stale. This is informational, not blocking - estimations are re-triggered explicitly (see spec 04).

### `PUT /api/v1/data-centers/:data_center_id/reports/:id`

Update an existing report.

**Authorization:** Only the API key that submitted the report, or an admin key.

### `DELETE /api/v1/data-centers/:data_center_id/reports/:id`

Delete a report.

**Authorization:** Only the API key that submitted the report, or an admin key.

## Convenience Endpoint: Bulk Report Listing

### `GET /api/v1/reports`

List reports across all data centers (for aggregate views).

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `year` | number | Filter by reporting_year |
| `source_type` | string | Filter by source_type |
| `submitted_by` | string | Filter by submitter API key ID |
| `page` | number | Page number |
| `per_page` | number | Items per page |

## Report Resolution Strategy

When multiple reports exist for the same data center and year, the system needs to pick one for estimation and aggregation purposes. The resolution order (highest priority first):

1. **company** - Self-reported by the DC operator (most authoritative)
2. **eed** - Mandatory regulatory reporting
3. **government** - Government/regulatory data
4. **third_party** - Third-party audits
5. **manual** - Manual dashboard entries

Within the same priority level, the most recently created report wins.

This resolution logic is implemented as a database view or a utility function:

```sql
CREATE VIEW resolved_reports AS
SELECT DISTINCT ON (data_center_id, reporting_year)
  *
FROM data_center_reports
ORDER BY
  data_center_id,
  reporting_year,
  CASE source_type
    WHEN 'company' THEN 1
    WHEN 'eed' THEN 2
    WHEN 'government' THEN 3
    WHEN 'third_party' THEN 4
    WHEN 'manual' THEN 5
  END,
  created_at DESC;
```

The estimation engine (spec 04) uses `resolved_reports` as input.

## Validation Rules

1. `reporting_year` is required, must be between 2000 and current year + 1
2. `source_type` is required, must be valid enum value
3. `data_center_id` must reference an existing data center
4. Energy values must be non-negative when provided
5. Water values must be non-negative when provided
6. PUE must be between 1.0 and 5.0 when provided
7. Percentages must be between 0 and 100 when provided

## File Structure

```
app/api/v1/
  data-centers/
    [data_center_id]/
      reports/
        route.ts          -- GET (list), POST (create)
        [id]/
          route.ts        -- GET (single), PUT, DELETE
  reports/
    route.ts              -- GET (bulk listing across all DCs)
```

## Migration of Existing Data

All existing rows in `data_center_annual_reports` are migrated to `data_center_reports` with:
- `source_type = 'eed'`
- `source_name = 'RVO EED Import 2025'`
- `submitted_by = <system_api_key_id>`

The import script (`scripts/import-rvo-data.js`) should be updated to use the new API (or at minimum set the source fields when writing directly to the database).
