# Spec 02: Data Center Master Record CRUD

## Prerequisites

- [01-database-schema.md](./01-database-schema.md) — `api_keys` table and `created_by`/`updated_by` columns on `data_centers` must exist
- [05-api-and-auth.md](./05-api-and-auth.md) — API key auth middleware (`lib/api-auth.ts`), service role client, pagination and validation utilities must be implemented

## Overview

The `data_centers` table is the master record. This spec defines a clean CRUD API for managing data center records, replacing the current ad-hoc endpoints (`/api/data-centers/dismiss`, `/api/debug/data-center`).

## Current State

- Data centers are imported via `scripts/import-rvo-data.js` from CSV
- Only two mutation endpoints exist: dismiss (`/api/data-centers/dismiss`) and debug data center endpoints
- No create/update/delete API for external consumers
- No authentication or attribution

## API Endpoints

All endpoints live under `/app/api/v1/data-centers/`.

### `GET /api/v1/data-centers`

List all data centers with filtering and pagination.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default: 1) |
| `per_page` | number | Items per page (default: 50, max: 200) |
| `country` | string | Filter by country |
| `type` | string | Filter by data_center_type enum value |
| `operator` | string | Filter by operator_name (partial match) |
| `status` | string | Filter by operational_status |
| `dismissed` | boolean | Filter by dismissed flag |
| `corrected` | boolean | Filter by corrected flag |
| `search` | string | Full-text search across name, operator, owner, city |

**Response:**
```json
{
  "data": [ { ...data_center_fields } ],
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total": 342,
    "total_pages": 7
  }
}
```

**Authorization:** Any valid API key (read-all).

### `GET /api/v1/data-centers/:id`

Get a single data center by ID, including its latest reports and latest estimation.

**Response:**
```json
{
  "data": {
    ...data_center_fields,
    "latest_reports": [ { ...report_fields } ],
    "latest_estimation": { ...estimation_fields } | null
  }
}
```

**Authorization:** Any valid API key.

### `POST /api/v1/data-centers`

Create a new data center record.

**Request Body:**
```json
{
  "data_center_name": "Example DC",
  "data_center_type": "Co-Location",
  "operator_name": "Example Corp",
  "country": "NL",
  "floor_space_sqm": 5000,
  "total_power_capacity_kw": 10000,
  ...optional_fields
}
```

**Required fields:** `data_center_name`
**Optional fields:** All other columns from the data_centers table.

**Response:** `201 Created` with the created record.

**Authorization:** Any valid API key. The `created_by` field is automatically set to the authenticated API key.

### `PUT /api/v1/data-centers/:id`

Update an existing data center record.

**Request Body:** Partial object with fields to update.

**Response:** `200 OK` with the updated record.

**Authorization:** Only the API key that created the record, or an admin key. The `updated_by` field is automatically set.

### `DELETE /api/v1/data-centers/:id`

Delete a data center and all associated reports and estimations (cascade).

**Response:** `204 No Content`

**Authorization:** Only the API key that created the record, or an admin key.

**Note:** Consider soft-delete (setting `dismissed = true`) as the default behavior, with hard-delete requiring an explicit `?hard=true` parameter. This prevents accidental data loss.

## Validation Rules

1. `data_center_name` is required and must be non-empty
2. `data_center_type` must be one of the enum values if provided: Enterprise, Government, Regional, Co-Location, Hyperscale, University
3. `year_built` is optional; if provided, must be between 1950 and current year + 5
4. `design_pue` is optional; if provided, must be between 1.0 and 5.0
5. `tier_level` is optional; if provided, must be 1, 2, 3, or 4
6. Numeric capacity fields must be non-negative when provided
7. Location: if `lau_code` is provided, `latitude`/`longitude` are optional. If `lau_code` is not provided, `latitude` and `longitude` are required. When provided, `latitude` must be between -90 and 90; `longitude` between -180 and 180

## Implementation Notes

### File Structure
```
app/api/v1/data-centers/
  route.ts          -- GET (list), POST (create)
  [id]/
    route.ts        -- GET (single), PUT (update), DELETE
```

### Shared Middleware
Authentication and authorization logic should be extracted into a shared middleware/utility:
```
lib/api-auth.ts     -- API key validation, ownership checks
```

### Backward Compatibility
- The existing internal dashboard routes (`/api/data-centers/dismiss`, `/api/debug/data-center`) continue to work for now
- They should be migrated to use the v1 API internally in a follow-up phase
- The internal dashboard uses a system API key for its operations

### Deduplication
When creating a data center, check for potential duplicates based on:
- Same `data_center_name` + `operator_name` + `country`
- If a potential duplicate is found, return a `409 Conflict` with the existing record ID, allowing the caller to decide whether to proceed or update the existing record instead
