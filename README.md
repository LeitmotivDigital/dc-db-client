# dc-db-client

TypeScript API client for the Data Center Database.

## Installation

```bash
npm install lm-dc-db-client
```

## Quick Start

```typescript
import { DataCenterClient } from 'dc-db-client';

const client = new DataCenterClient({
  baseUrl: 'https://api.example.com',
  apiKey: 'lm_your_api_key_here',
});

// List data centers
const { data, pagination } = await client.dataCenters.list({ country: 'Netherlands' });
console.log(`Found ${pagination.total} data centers`);

// Get a single data center — every column, all associated data,
// plus the latest reports and estimation
const dc = await client.dataCenters.get('dc-uuid');
console.log(dc.sources, dc.tags, dc.notes, dc.tenants, dc.updates);
console.log(dc.latest_reports, dc.latest_estimation);
```

## API Reference

### Client

```typescript
const client = new DataCenterClient({
  baseUrl: string,   // API server URL
  apiKey: string,     // Your API key (lm_...)
  timeout?: number,   // Request timeout in ms (default: 30000)
});
```

### Data Centers

```typescript
// List with filtering and pagination
const result = await client.dataCenters.list({
  country: 'Netherlands',
  type: 'Hyperscale',
  operator: 'equinix',
  search: 'amsterdam',
  page: 1,
  per_page: 50,
});

// Additional filters
await client.dataCenters.list({
  owner_type: 'Developer',              // Investor | Developer | Operator | Utility | Enterprise | Government | University
  data_source_type: 'Research',         // EED | Research | Rumor
  data_source: 'Data Center Rebellion (Germany dataset)',  // the source's own label, matched exactly
  status: 'topping_out',                // planned | groundbreaking | foundation_laid | topping_out | under_construction | operational | cancelled | paused
  cooling_category: 'liquid-cooled (DLC)',
  metro_region: 'Frankfurt',
  expansion: true,                      // extra halls/phases on an existing campus, not a new build
  tag: 'protest',                       // narrow with tag_type when a value exists under two types
  tag_type: 'Civil Action',
});

// Dismissed records are excluded by default; `'all'` returns everything
const everything = await client.dataCenters.list({ dismissed: 'all', per_page: 200 });

// CRUD
const dc = await client.dataCenters.create({ data_center_name: 'My DC', country: 'Netherlands' });
const detail = await client.dataCenters.get(dc.id);
const updated = await client.dataCenters.update(dc.id, { design_pue: 1.3 });
await client.dataCenters.delete(dc.id);
```

Every writable column is accepted by `create`/`update` and every column is
returned by `list`/`get` — including the location detail (`metro_region`,
`postal_code`, `site_area_hectares`), classification (`owner_type`,
`data_source_type`, `status`, `cooling_category`, `expansion`),
lifecycle (`planned_commission_date`, `operational_probability_percentage`), and
the per-data-center estimation overrides in `default_assumptions`.

### Associated Data

Notes, sources, tenants, tags, and source updates are **embedded in the data
center response**, not fetched from separate endpoints.

`get(id)` always returns all five:

```typescript
const dc = await client.dataCenters.get('dc-id');

dc.notes;    // DataCenterNote[]         — editorial notes
dc.sources;  // Source[]                 — external references (URL, publication, date, archive)
dc.tenants;  // DataCenterTenant[]       — known customers/occupants
dc.tags;     // DataCenterTag[]          — { type, value, note } (Feature / Intended Use / Civil Action)
dc.updates;  // DataCenterSourceUpdate[] — AI summaries of fetched sources, with `highlights`
```

`list()` embeds nothing by default so large pages stay cheap. Opt in with
`include` — the relations are batch-fetched for the whole page, not per row:

```typescript
const { data } = await client.dataCenters.list({
  country: 'Germany',
  include: ['sources', 'tags'],   // or include: 'all'
});

data[0].sources;  // present
data[0].notes;    // undefined — not requested
```

Because relations you did not ask for are absent (rather than empty arrays),
`'notes' in dc` distinguishes "no notes" from "not requested".

Only sources a human has read and confirmed are published, so every `Source` you
receive carries `state: 'verified'`. When a source is verified its page content
is snapshotted, and `archived_at` (plus `archived_title`) records that capture —
useful for citing a reference whose URL has since died or been rewritten. The
archived text itself stays internal.

### Reports

```typescript
// Reports for a specific data center
const reports = await client.dataCenters.reports('dc-id').list({ year: 2024 });
const report = await client.dataCenters.reports('dc-id').create({
  reporting_year: 2024,
  source_type: 'company',
  total_energy_consumption_kwh: 52_000_000,
});
await client.dataCenters.reports('dc-id').get(report.id);
await client.dataCenters.reports('dc-id').update(report.id, { reported_pue: 1.35 });
await client.dataCenters.reports('dc-id').delete(report.id);

// List reports across all data centers
const allReports = await client.reports.list({ year: 2024, source_type: 'eed' });

// …or scope the cross-DC listing to one data center
const scoped = await client.reports.list({ data_center_id: 'dc-id', year: 2024 });
```

### Estimations

```typescript
// Trigger estimation for a data center
const estimation = await client.dataCenters.estimations('dc-id').create({
  reporting_year: 2024,
});

// Query estimations of one data center
const history = await client.dataCenters.estimations('dc-id').list({ year: 2024 });
const one = await client.dataCenters.estimations('dc-id').get(estimation.id);
const newest = await client.dataCenters.estimations('dc-id').latest();

// Across all data centers (latest per data center, or a single data center)
const allLatest = await client.estimations.list({ latest: true, year: 2024 });
const forOne = await client.estimations.list({ data_center_id: 'dc-id' });

// Batch estimation (all data centers)
const batch = await client.estimations.batch({ reporting_year: 2024 });

// Aggregated statistics over the latest estimation per data center
const stats = await client.estimations.aggregates({ year: 2024 });
```

`latest()` returns a single estimation and throws `NotFoundError` when the data
center has none. `list({ latest: true })` on the **global** resource returns a
paginated list of the newest estimation per data center.

A data center's `default_assumptions` feed into every estimation. Precedence,
highest first: assumptions passed to `create()` → the data center's
`default_assumptions` → the global defaults.

### API Keys (Admin)

```typescript
const newKey = await client.apiKeys.create({
  organization_name: 'Research Institute',
  contact_email: 'admin@example.org',
});
console.log(newKey.key); // Only shown once!

const keys = await client.apiKeys.list();
await client.apiKeys.delete(newKey.id);
```

## Pagination

All list methods return a `PaginatedList<T>`:

```typescript
interface PaginatedList<T> {
  data: T[];
  pagination: { page: number; per_page: number; total: number; total_pages: number };
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
```

Loop through all pages:

```typescript
let page = 1;
let result;
do {
  result = await client.dataCenters.list({ page, per_page: 100 });
  for (const dc of result.data) {
    // process each data center
  }
  page++;
} while (result.hasNextPage);
```

## Error Handling

All API errors throw typed exceptions:

```typescript
import { NotFoundError, ValidationError, ConflictError, ApiError } from 'dc-db-client';

try {
  await client.dataCenters.get('nonexistent-id');
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log('Not found');
  } else if (err instanceof ValidationError) {
    console.log('Validation failed:', err.details);
  } else if (err instanceof ConflictError) {
    console.log('Duplicate detected:', err.details);
  } else if (err instanceof ApiError) {
    console.log(`API error ${err.status}: ${err.error}`);
  }
}
```

| Error Class | HTTP Status | When |
|---|---|---|
| `ValidationError` | 400 | Invalid request data |
| `AuthenticationError` | 401 | Missing or invalid API key |
| `ForbiddenError` | 403 | Not authorized (write-own violation) |
| `NotFoundError` | 404 | Resource not found |
| `ConflictError` | 409 | Duplicate detection |
| `RateLimitError` | 429 | Too many requests |
| `ApiError` | other | Any other server error |

## Examples

Run examples directly with `tsx`:

```bash
BASE_URL=http://localhost:3000 API_KEY=lm_... npx tsx examples/list-data-centers.ts
BASE_URL=http://localhost:3000 API_KEY=lm_... npx tsx examples/create-data-center.ts
BASE_URL=http://localhost:3000 API_KEY=lm_... DC_ID=<uuid> npx tsx examples/submit-report.ts
BASE_URL=http://localhost:3000 API_KEY=lm_... DC_ID=<uuid> npx tsx examples/run-estimation.ts
BASE_URL=http://localhost:3000 API_KEY=lm_... npx tsx examples/manage-api-keys.ts
```
