# Backend (NestJS + TypeORM + PostgreSQL)

This folder contains the NestJS API for companies, assets, public intake via QR, and operator service-request listing.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 13+ (local or via Docker)
- Optional: MinIO (planned for media uploads in future steps)

## Environment Configuration

The backend uses a deterministic config validated at startup. Set these environment variables:

- DATABASE_URL: postgres://user:password@host:port/dbname
- PORT: API port (default 3000)
- NODE_ENV: development | production | test
- S3_ENDPOINT: optional (planned)
- S3_BUCKET: optional (planned)
- S3_ACCESS_KEY: optional (planned)
- S3_SECRET_KEY: optional (planned)

Example .env:

```text
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=smart_service
POSTGRES_PORT=5432
PORT=3000
DATABASE_URL=postgres://postgres:postgres@db:5432/smart_service
NODE_ENV=development
```

Note: The app reads env once at boot and validates them. It will fail-fast if anything is invalid/missing.

## Install Dependencies

```bash
npm install
```

## NPM Scripts

```bash

# Start in dev mode with live reload
npm run start:dev

# Run TypeORM migrations
npm run migration:run

# Seed basic data (one company, a couple assets, one client)
npm run seed

# Run unit tests (not configured yet)
npm test
```

## Database

- ORM: TypeORM
- Migrations: Required (synchronize is disabled)
- UUIDs everywhere (uses gen_random_uuid() in migrations)

Verify with psql:

```bash
psql $DATABASE_URL
```

## Health Check

Endpoint:

```bash
curl http://localhost:3000/health
```

Expected:

```json
{
  "ok": true,
  "db": "up",
  "timestamp": "2025-11-07T09:00:00.000Z"
}
```

If Postgres is down, it returns 503 with db: "down".

## API Overview

For a handy list of working CURLs, see Useful CURLs (docs/ or root of repo if you saved it there). 

Note: Public endpoints intentionally return limited fields.
#### TLDR:
- Companies
  - POST /v1/companies
  - GET /v1/companies
  - GET /v1/companies/:id

- Assets
  - POST /v1/assets
  - GET /v1/assets/:id
  - POST /v1/assets/:id/qr (returns qrToken and an intakeUrl)

- Public QR Resolution
  - GET /v1/public/qr/asset/:token (limited asset info)

- Public Intake (Service Requests)
  - POST /v1/public/intake/:token/request
    - Body: { type, description, contact: { name, email, phone }, media?: [{ url, kind }] }
    - Dedup client by email or phone (scoped by company)
    - Creates service request with channel="QR", status="PENDING"
    - Includes simple in-memory rate limit per token+IP per hour

- Operator: Service Requests
  - GET /v1/service-requests?status=&from=&to=&cursor=&limit=
    - Cursor-based pagination (createdAt desc, then id desc)
    - Returns minimal cards
  - GET /v1/service-requests/:id (full details including media)
  - PATCH /v1/service-requests/:id (update status, assign tech, notes, scheduled date)
  - POST /v1/service-requests/:id/client-media (upload media for client)
  - POST /v1/service-requests/:id/technician-media (upload media for technician)

- Technicians
  - POST /v1/technicians (create technician)
  - GET /v1/technicians (list all technicians)
  - GET /v1/technicians/company/:companyId (list by company)
  - GET /v1/technicians/:id/service-requests (list requests for technician)

## SSE Real-Time Events

The backend uses **Server-Sent Events (SSE)** for real-time updates. This allows the operator dashboard or technician view to receive instant notifications when service requests are created or updated without polling.

### Connection

Connect to the SSE stream using the `EventSource` API (native in modern browsers):

```javascript
const companyId = 'your-company-uuid';
const eventSource = new EventSource(`http://localhost:3000/v1/realtime/stream?companyId=${companyId}`);

eventSource.onopen = () => {
  console.log('Connected to SSE stream');
};

eventSource.onerror = (err) => {
  console.error('SSE Error:', err);
  // EventSource automatically attempts to reconnect
};
```

### Listening to Events

Events are sent as JSON strings in the `data` field of the message. Since NestJS SSE implementation often sends unnamed events (message events), you typically listen to `onmessage`.

```javascript
eventSource.onmessage = (event) => {
  const parsedData = JSON.parse(event.data);
  console.log('Received event:', parsedData);
  
  // Data structure example:
  // {
  //   type: 'service-request.updated',
  //   data: {
  //     id: 'service-request-uuid',
  //     status: 'PENDING',
  //     updated_at: '2025-11-25T09:30:00.000Z'
  //   }
  // }
  
  if (parsedData.type === 'service-request.updated') {
     updateServiceRequestInUI(parsedData.data);
  }
};
```

### Events Emitted by Server

| Event Type | Description | Data Structure |
|------------|-------------|----------------|
| `service-request.updated` | Emitted when a service request is created or updated | `{ id, status, technician_id?, updated_at }` |

### Closing Connection

```javascript
// Close the connection when component unmounts or user logs out
eventSource.close();
```

### CORS Configuration

The SSE endpoint is configured to accept connections. For production, ensure your gateway matches the relevant origins.



## Development Workflow

1. Ensure DATABASE_URL points to a running PostgreSQL.
2. Install dependencies: `npm ci && npm install`
3. Run migrations: `npm run migration:run`
4. Optionally seed: `npm run seed`
5. Start dev server: `npm run start:dev`
6. Hit health check and APIs.

Note: By default `service-request`s are rate limited to 5 per asset per IP to change this modify the `maxRequests` in `src/common/utils/rate-limiter`

## Folder Structure (high-level)

- src/
  - app.module.ts
  - config/ (validated config module)
  - health/ (healthcheck)
  - entities/ (TypeORM entities)
  - migrations/ (DB migrations)
  - common/utils/ (e.g., QR token generator, cursor, rate-limiter)
  - modules/
    - companies/
    - assets/
    - clients/
    - intake/
    - service-requests/

## QR Tokens

- Generated using a URL-safe random ID (24 chars)
- Unique constraint with retry on collisions
- Public resolver endpoint maps token → limited asset data

## Pagination

- Cursor-based by default for service-requests, sorted by createdAt desc, then id desc
- Use `nextCursor` from response to fetch next page

## Troubleshooting

- App fails at boot with config errors → verify .env keys and types
- Health check shows db: "down" → verify DATABASE_URL, Postgres reachability
- Migrations fail with permissions → ensure your DB user has CREATE/ALTER
- 429 Too Many Requests on public intake → you hit in-memory rate limit (resets in ~1 hour)
- UUID default missing (gen_random_uuid) → ensure pgcrypto or appropriate extension is available; migrations use gen_random_uuid()

For Docker/Dev Container usage, see the parent README in backend-capstone.
