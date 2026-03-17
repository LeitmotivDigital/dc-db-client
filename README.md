# dc-db-client

TypeScript API client for the Data Center Database.

## Installation

```bash
npm install dc-db-client
```

## Quick Start

```typescript
import { DataCenterClient } from 'dc-db-client';

const client = new DataCenterClient({
  baseUrl: 'https://api.example.com',
  apiKey: 'lm_your_api_key_here',
});

// List data centers
const { data, pagination } = await client.dataCenters.list({ country: 'NL' });
console.log(`Found ${pagination.total} data centers`);

// Get a single data center with latest reports and estimation
const dc = await client.dataCenters.get('dc-uuid');
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
  country: 'NL',
  type: 'Hyperscale',
  operator: 'equinix',
  search: 'amsterdam',
  page: 1,
  per_page: 50,
});

// CRUD
const dc = await client.dataCenters.create({ data_center_name: 'My DC', country: 'NL' });
const detail = await client.dataCenters.get(dc.id);
const updated = await client.dataCenters.update(dc.id, { design_pue: 1.3 });
await client.dataCenters.delete(dc.id);
```

### Reports

```typescript
// Reports for a specific data center
const reports = await client.dataCenters.reports('dc-id').list({ year: 2024 });
const report = await client.dataCenters.reports('dc-id').create({
  reporting_year: 2024,
  source_type: 'company',
  total_energy_consumption_kwh: 52_000_000,
});
await client.dataCenters.reports('dc-id').update(report.id, { pue: 1.35 });
await client.dataCenters.reports('dc-id').delete(report.id);

// List reports across all data centers
const allReports = await client.reports.list({ year: 2024, source_type: 'eed' });
```

### Estimations

```typescript
// Trigger estimation for a data center
const estimation = await client.dataCenters.estimations('dc-id').create({
  reporting_year: 2024,
});

// List estimation history
const history = await client.dataCenters.estimations('dc-id').list();

// Batch estimation (all data centers)
const batch = await client.estimations.batch({ reporting_year: 2024 });

// Aggregated statistics
const stats = await client.estimations.aggregates({ year: 2024 });
```

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
