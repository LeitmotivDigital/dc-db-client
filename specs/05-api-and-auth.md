# Spec 05: Public API Design and API Key Authorization

## Prerequisites

- [01-database-schema.md](./01-database-schema.md) — `api_keys` table must exist with bootstrap system key

## Overview

This spec defines the authentication system, authorization rules, and API conventions that apply across all v1 endpoints (specs 02-04).

## Authentication: API Keys

### Key Format
```
lm_dk3m7x9p2a4b6c8d0e1f3g5h7i9j1k
└──┘└──────────────────────────────┘
prefix        random (32 chars)
```

- Prefix: `lm_` (fixed) + 4 random chars for human identification
- Total length: ~40 characters
- Generated using cryptographically secure random bytes
- Only the SHA-256 hash is stored in the database; the raw key is returned exactly once at creation

### Key Transmission

API keys are passed via the `Authorization` header:

```
Authorization: Bearer lm_dk3m7x9p2a4b6c8d0e1f3g5h7i9j1k
```

### Key Management Endpoints

#### `POST /api/v1/api-keys`

Create a new API key. **Requires an admin API key.**

**Request Body:**
```json
{
  "organization_name": "Example Research Institute",
  "contact_email": "admin@example.org",
  "description": "Used for automated EED data submission",
  "expires_at": "2027-01-01T00:00:00Z"
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "uuid",
    "key": "lm_dk3m7x9p2a4b6c8d0e1f3g5h7i9j1k",
    "key_prefix": "lm_dk3m",
    "organization_name": "Example Research Institute",
    "active": true,
    "expires_at": "2027-01-01T00:00:00Z",
    "created_at": "2026-03-17T..."
  }
}
```

**Important:** The `key` field is only returned in this response. It cannot be retrieved again.

#### `GET /api/v1/api-keys`

List all API keys (admin only). Returns metadata only, never the key or hash.

#### `DELETE /api/v1/api-keys/:id`

Deactivate an API key (admin only). Sets `active = false` rather than deleting, to preserve audit trail.

### Bootstrap Key

A system API key is created during initial setup (via migration or seed script). This key:
- Has `is_admin = true`
- Is used by the dashboard itself for internal operations
- Is stored as an environment variable (`SYSTEM_API_KEY`)
- Attributes all existing/imported data to the system

## Authorization Model

### Read-All, Write-Own

| Operation | Scope |
|-----------|-------|
| `GET` (list/read) | Any valid, active, non-expired API key |
| `POST` (create) | Any valid API key; `created_by`/`submitted_by` auto-set |
| `PUT` (update) | Only the API key that created the record, OR admin keys |
| `DELETE` | Only the API key that created the record, OR admin keys |

### Ownership Check Implementation

```typescript
// lib/api-auth.ts

export async function authenticateRequest(
  request: NextRequest
): Promise<{ apiKey: ApiKey } | { error: string; status: number }> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing or invalid Authorization header', status: 401 }
  }

  const rawKey = authHeader.slice(7)
  const keyHash = sha256(rawKey)

  // Look up key
  const { data: apiKey } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .eq('active', true)
    .single()

  if (!apiKey) {
    return { error: 'Invalid API key', status: 401 }
  }

  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return { error: 'API key has expired', status: 401 }
  }

  // Update last_used_at (fire-and-forget, don't block the request)
  supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', apiKey.id)

  return { apiKey }
}

export function authorizeWrite(
  apiKey: ApiKey,
  record: { created_by?: string; submitted_by?: string }
): boolean {
  if (apiKey.is_admin) return true
  const owner = record.created_by || record.submitted_by
  return owner === apiKey.id
}
```

## API Conventions

### Base Path
All public API endpoints are under `/api/v1/`.

### Request/Response Format
- Content-Type: `application/json`
- All responses wrapped in `{ "data": ... }` for success or `{ "error": "...", "details": "..." }` for errors

### HTTP Status Codes
| Code | Usage |
|------|-------|
| 200 | Successful read or update |
| 201 | Successful creation |
| 202 | Accepted (async batch operations) |
| 204 | Successful deletion |
| 400 | Validation error |
| 401 | Missing or invalid API key |
| 403 | Valid key but insufficient permissions (write-own violation) |
| 404 | Resource not found |
| 409 | Conflict (duplicate detection) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

### Pagination
All list endpoints support pagination:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total": 342,
    "total_pages": 7
  }
}
```

### Rate Limiting

Apply rate limiting per API key:
- Read endpoints: 100 requests/minute
- Write endpoints: 30 requests/minute
- Batch endpoints: 5 requests/minute

Implementation: Use a simple in-memory counter or Supabase-based tracking. For v1, an in-memory approach (e.g., using a `Map<string, { count: number, resetAt: number }>`) is sufficient. Consider Redis or a dedicated rate-limiting service for production scale.

### Error Response Format
```json
{
  "error": "Validation failed",
  "details": {
    "fields": {
      "reporting_year": "Must be between 2000 and 2027",
      "total_energy_consumption_kwh": "Must be non-negative"
    }
  }
}
```

## Dashboard Authentication

The dashboard currently uses Supabase's publishable key with cookie-based auth. For the v1 API, the dashboard should:

1. Continue using Supabase's SSR client for internal routes (`/api/stats/*`, `/api/charts/*`)
2. Use the system API key when calling v1 endpoints internally
3. The v1 API is primarily for external consumers; the dashboard doesn't need to route all traffic through it

This means there are two auth paths:
- **Internal (dashboard):** Supabase SSR client (existing, unchanged)
- **External (v1 API):** API key-based auth (new)

The v1 routes use a separate Supabase client that authenticates with the service role key (since API key auth is handled at the application layer, not Supabase RLS).

## Supabase Client for v1 Routes

```typescript
// utils/supabase/service.ts
import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

This bypasses RLS since authorization is handled by the API key middleware. The service role key is never exposed to the client.

## Complete Endpoint Summary

```
POST   /api/v1/api-keys                                    (admin)
GET    /api/v1/api-keys                                    (admin)
DELETE /api/v1/api-keys/:id                                (admin)

GET    /api/v1/data-centers                                (read-all)
POST   /api/v1/data-centers                                (create)
GET    /api/v1/data-centers/:id                            (read-all)
PUT    /api/v1/data-centers/:id                            (write-own)
DELETE /api/v1/data-centers/:id                            (write-own)

GET    /api/v1/data-centers/:id/reports                    (read-all)
POST   /api/v1/data-centers/:id/reports                    (create)
GET    /api/v1/data-centers/:id/reports/:report_id         (read-all)
PUT    /api/v1/data-centers/:id/reports/:report_id         (write-own)
DELETE /api/v1/data-centers/:id/reports/:report_id         (write-own)

GET    /api/v1/reports                                     (read-all)

POST   /api/v1/data-centers/:id/estimations                (create)
GET    /api/v1/data-centers/:id/estimations                (read-all)

GET    /api/v1/estimations                                 (read-all)
POST   /api/v1/estimations/batch                           (create)
GET    /api/v1/estimations/aggregates                      (read-all)
```
