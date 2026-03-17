# Implementation Plan

## Phase Order and Dependencies

```
Phase 1: Database Schema ──────────────────── [01-database-schema.md]
    │
Phase 2: API Auth Infrastructure ──────────── [05-api-and-auth.md]
    │
    ├── Phase 3: Data Center CRUD API ─────── [02-data-center-master.md]
    │
    ├── Phase 4: Reports API ──────────────── [03-reports.md]
    │       │
    │       └── Phase 5: Estimation Engine ── [04-estimations.md]
    │
    └── Phase 6: Dashboard Migration
            │
            └── Phase 7: Cleanup
```

Phases 3 and 4 can run in parallel once Phase 2 is complete. Phase 5 depends on Phase 4 (needs `resolved_reports` view). Phases 6–7 are sequential.

---

## Phase 1: Database Schema

**Spec:** [01-database-schema.md](./01-database-schema.md)

**Goal:** Lay the database foundation without changing application behavior.

**Deliverables:**
- Migrations for `api_keys`, `data_centers` extensions, table rename + extensions, `data_center_estimations`, views
- Backfill existing data with system key attribution and `source_type = 'eed'`
- Code-level find-and-replace: `data_center_annual_reports` → `data_center_reports`
- Regenerated TypeScript types

**Risk:** The table rename breaks all existing code referencing the old name. Must deploy the rename and code updates together as a single deployment.

**Verification:** All existing dashboard functionality works unchanged. New tables exist but are empty (except backfilled data).

---

## Phase 2: API Auth Infrastructure

**Spec:** [05-api-and-auth.md](./05-api-and-auth.md)

**Goal:** Build the authentication/authorization layer before exposing any public endpoints.

**Deliverables:**
- `lib/api-auth.ts` — key validation, ownership checks, hashing
- `utils/supabase/service.ts` — service role client for v1 routes
- `lib/api-validation.ts` — shared field validation
- `lib/api-pagination.ts` — shared pagination parsing/formatting
- API key management endpoints (`POST/GET/DELETE /api/v1/api-keys`)

**Verification:** Can create and list API keys. Auth middleware works in isolation.

---

## Phase 3: Data Center CRUD API

**Spec:** [02-data-center-master.md](./02-data-center-master.md)

**Goal:** Expose the data center master record via the v1 API.

**Deliverables:**
- `GET/POST /api/v1/data-centers`
- `GET/PUT/DELETE /api/v1/data-centers/:id`
- Validation rules and deduplication check

**Verification:** Full CRUD works via API key auth. Existing dashboard routes unaffected.

---

## Phase 4: Reports API

**Spec:** [03-reports.md](./03-reports.md)

**Goal:** Expose report submission with source tracking.

**Deliverables:**
- `GET/POST /api/v1/data-centers/:id/reports`
- `GET/PUT/DELETE /api/v1/data-centers/:id/reports/:report_id`
- `GET /api/v1/reports` (bulk listing)
- Updated import script (`scripts/import-rvo-data.js`) to set source fields

**Verification:** Can submit reports from multiple sources for the same DC/year.

---

## Phase 5: Estimation Engine

**Spec:** [04-estimations.md](./04-estimations.md)

**Goal:** Implement the estimation trigger and persistence layer.

**Deliverables:**
- `lib/estimation-engine.ts` — orchestrates pipeline, reuses existing estimation functions
- `lib/derived-metrics.ts` — centralized emission/water/PUE formulas extracted from stat routes
- `POST /api/v1/data-centers/:id/estimations` (trigger single)
- `GET /api/v1/data-centers/:id/estimations` (list per DC)
- `POST /api/v1/estimations/batch` (trigger batch)
- `GET /api/v1/estimations` (list all)
- `GET /api/v1/estimations/aggregates` (pre-aggregated stats)
- Initial batch estimation run to populate the table

**Verification:** Can trigger estimations and see persisted results. Dashboard still uses on-the-fly computation at this point.

---

## Phase 6: Dashboard Migration

**Goal:** Migrate the 30+ existing stats endpoints from on-the-fly estimation to reading from `latest_estimations`.

This is the only phase not covered by a dedicated spec — it's the integration work connecting the new system to the existing dashboard.

**Approach:**
1. **Migrate stats endpoints incrementally** — for each `/api/stats/*` route using `fetchAndFillCapacityData` or `fetchAndFillAnnualReportData`, add a code path reading from `latest_estimations`. Keep the old path behind a feature flag. Verify both produce equivalent results.
2. **Update the assumptions form flow** — when user saves assumptions, trigger `POST /api/v1/estimations/batch`, wait for completion, then invalidate SWR caches. Keep on-the-fly computation for interactive tuning (before save) for responsiveness.
3. **Update the estimated data centers table** — read from `data_center_estimations` + `data_center_reports` instead of computing on-the-fly.
4. **Remove old code paths** — once all routes are migrated and verified, remove on-the-fly estimation from stats routes. The `fillMissingCapacityData` and `fillMissingAnnualReportData` functions remain (used by the estimation engine) but are no longer called from stats routes.

**Verification:** Dashboard shows identical numbers when reading from estimations vs on-the-fly computation. Write integration tests comparing both paths within floating-point tolerance.

---

## Phase 7: Cleanup

**Goal:** Remove legacy code and patterns.

**Steps:**
1. Remove feature flags from Phase 6
2. Remove deprecated internal routes superseded by v1 (`/api/data-centers/dismiss`, `/api/debug/data-center`)
3. Update the import script to call the v1 API directly
4. Add API documentation
5. Add monitoring/alerting for API key usage

---

## Risk Mitigation

### Data Integrity
- All migrations are additive (new columns, new tables) — no data is deleted
- The table rename is the riskiest step — deploy code changes and migration together

### Rollback
- Each phase can be rolled back independently
- Phase 1: reverse migrations (drop new tables, rename table back)
- Phase 6: flip feature flags back to on-the-fly computation

### Testing
- Integration tests comparing on-the-fly vs persisted results (Phase 6)
- API endpoint tests for each v1 route (Phases 2–5)

## Estimated Scope

| Phase | New Files | Modified Files | Complexity |
|-------|-----------|----------------|------------|
| 1 — Schema | 5 migrations, types regen | ~30 (table rename) | Medium |
| 2 — Auth infra | 4–5 modules + 3 routes | 0 | Medium |
| 3 — DC CRUD | 2 route files | 0 | Low |
| 4 — Reports | 3 route files, script update | 1 | Low–Medium |
| 5 — Estimation engine | 2 modules + 4 route files | 0 | Medium–High |
| 6 — Dashboard migration | 0 | ~30 stats routes + components | High |
| 7 — Cleanup | 0 | ~10 removals | Low |
