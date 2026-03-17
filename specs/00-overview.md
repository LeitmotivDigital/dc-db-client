# Architecture Redesign: From On-the-Fly Estimation to Persisted Data Model

## Problem Statement

Currently, all estimation and derived metrics are computed on-the-fly in API routes and frontend code. Every stat endpoint (30+) independently fetches data, fills missing values via `fillMissingCapacityData()` and `fillMissingAnnualReportData()`, and returns computed results. This means:

1. **No auditability** - Estimations are ephemeral; you can't compare how estimates changed over time or across different assumption sets.
2. **No attribution** - There's no concept of "who submitted this data" or "which estimation model produced this".
3. **Duplicated computation** - The same estimation cascade runs redundantly across dozens of endpoints per page load.
4. **No external API** - Third parties can't contribute data or consume structured results.
5. **Mixed concerns** - The `data_center_annual_reports` table holds EED data but has no source tracking, and estimations live only in memory.

## Target Architecture

```
data_centers (master record)
    |
    |--- data_center_reports (sourced submissions: EED, company, third-party)
    |       - has source_type, source_name, submitted_by (API key)
    |       - replaces current data_center_annual_reports
    |
    |--- data_center_estimations (persisted estimation snapshots)
            - has estimation_source, assumptions used, all computed values
            - created by running estimation logic against master + reports
            - immutable snapshots (append-only)
```

## Specification Documents

| Spec | Scope |
|------|-------|
| [01-database-schema.md](./01-database-schema.md) | New tables, migrations, and schema changes |
| [02-data-center-master.md](./02-data-center-master.md) | CRUD operations on the master data center record |
| [03-reports.md](./03-reports.md) | Report submission with source attribution |
| [04-estimations.md](./04-estimations.md) | Estimation trigger, storage, and retrieval |
| [05-api-and-auth.md](./05-api-and-auth.md) | Public API design and API key authorization |
| [00-implementation-plan.md](./00-implementation-plan.md) | Phased implementation order, dependencies, and risk mitigation |

## Key Design Decisions

### 1. Reports replace annual_reports with source tracking
The current `data_center_annual_reports` table becomes `data_center_reports` with added `source_type`, `source_name`, and `submitted_by` fields. The existing UNIQUE constraint on `(data_center_id, reporting_year)` changes to `(data_center_id, reporting_year, source_type, submitted_by)` since multiple sources can report for the same DC and year.

### 2. Estimations are immutable snapshots
Each estimation run creates a new row. You can query the latest estimation or compare historical ones. The assumptions used are stored alongside the results so they're self-documenting.

### 3. Dashboard reads from estimations table
Instead of computing on every request, the stats API routes read pre-computed values from `data_center_estimations`. This is a significant simplification of the 30+ stat endpoints.

### 4. Estimation logic stays in TypeScript, not SQL
The existing `lib/capacity-estimation.ts` and `lib/report-estimation.ts` contain well-tested business logic. Rather than rewriting this as database functions, we keep it in TypeScript and invoke it via an API endpoint that persists the results. This keeps the logic testable, readable, and version-controlled alongside the codebase.

### 5. API key authorization with read-all, write-own semantics
External consumers authenticate via API keys. Any authenticated user can read all data centers, reports, and estimations. Write/update/delete operations are scoped to records created by that API key.
