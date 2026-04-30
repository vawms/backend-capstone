# Backend (NestJS + TypeORM + PostgreSQL)

This folder contains the NestJS API for companies, assets, public intake via QR, and operator service-request listing.

## Getting Started

There are two ways to run the backend:

1. **Development** — Use the Dev Container with Postgres running in Docker. See the [root README](../README.md) or run `./scripts/dev.sh` from the project root.
2. **QA / Testing** — Run everything in Docker (Postgres + backend). See the [root README](../README.md) or run `./scripts/qa.sh` from the project root. Migrations and seeding are handled automatically.

The sections below cover running the backend **manually inside the Dev Container** (option 1).

## Prerequisites

- Node.js 18+ and npm (provided by the Dev Container)
- PostgreSQL 13+ (provided by Docker Compose)
- Optional: MinIO (planned for media uploads in future steps)

## Environment Configuration

The backend validates config at startup and will fail-fast if anything is invalid or missing. Key environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `postgres` | PostgreSQL hostname |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | `postgres` | PostgreSQL password |
| `DB_DATABASE` | `smart_service` | Database name |
| `DATABASE_URL` | — | Alternative connection string (used by some tooling) |
| `PORT` | `3000` | API listen port |
| `NODE_ENV` | `development` | Environment mode |
| `JWT_SECRET` | `super-secret` | JWT signing secret |
| `APP_BASE_URL` | `http://localhost:3000` | Base URL used in rating links sent to clients |

Example `.env`:

```text
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=smart_service
POSTGRES_PORT=5432
PORT=3000
DATABASE_URL=postgres://postgres:postgres@postgres:5432/smart_service
DB_HOST=postgres
DB_USERNAME=postgres
DB_PASSWORD=postgres
NODE_ENV=development
JWT_SECRET=super-secret
```

## Install Dependencies

```bash
npm ci
```

## NPM Scripts

```bash
# Start in dev mode with live reload
npm run start:dev

# Start in production mode (requires npm run build first)
npm run start:prod

# Build the project
npm run build

# Run TypeORM migrations
npm run migration:run

# Revert the last migration
npm run migration:revert

# Generate a new migration from entity changes
npm run migration:generate

# Seed sample data (1 company, 3 assets, 3 technicians, 3 service requests + 1 follow-up)
npm run seed

# Run unit tests
npm test

# Lint and format
npm run lint
npm run format
```

## Database

- ORM: TypeORM
- Migrations: Required (`synchronize` is disabled)
- UUIDs everywhere (uses `gen_random_uuid()` in migrations)

Verify with psql:

```bash
psql $DATABASE_URL
```

## Health Check

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

If Postgres is down, it returns 503 with `db: "down"`.

## API Overview

For a handy list of working CURLs, see the `docs/` folder (if available).

Note: Public endpoints intentionally return limited fields.

#### Endpoints

- **Companies**
  - `POST /v1/companies`
  - `GET /v1/companies`
  - `GET /v1/companies/:id`

- **Assets**
  - `POST /v1/assets`
  - `GET /v1/assets/:id`
  - `POST /v1/assets/:id/qr` (returns qrToken and an intakeUrl)

- **Public QR Resolution**
  - `GET /v1/public/qr/asset/:token` (limited asset info)

- **Public Intake (Service Requests)**
  - `POST /v1/public/intake/:token/request`
    - Body: `{ type, description, contact: { name, email, phone }, media?: [{ url, kind }] }`
    - Dedup client by email or phone (scoped by company)
    - Creates service request with `channel="QR"`, `status="PENDING"`
    - In-memory rate limit per token+IP per hour

- **Public: Client Ratings**
  - `GET /v1/public/intake/rate/:token` — check if a rating token is eligible (`{ eligible, already_rated }`)
  - `POST /v1/public/intake/rate/:token` — submit a rating (`{ score: 1-5, comment? }`)
    - Token is generated automatically when an SR transitions to RESOLVED or CLOSED
    - Included in the status-update email sent to the client
    - One-time use: returns 400 if already rated

- **Operator: Service Requests**
  - `GET /v1/service-requests?status=&from=&to=&cursor=&limit=&parentId=&rootOnly=`
    - Cursor-based pagination (createdAt desc, then id desc)
    - Returns minimal cards with `parent_id` and `has_followups` fields
    - `parentId` — show only follow-ups of a given SR
    - `rootOnly=true` — show only original (root) requests, excluding follow-ups
  - `GET /v1/service-requests/:id` (full details including media, follow-up fields)
  - `PATCH /v1/service-requests/:id` (update status, assign tech, notes, scheduled date)
    - Rescheduling: changing `scheduled_date` is blocked on RESOLVED/CLOSED SRs and emits a `service_request.rescheduled` event
  - `POST /v1/service-requests/:id/follow-up` (create a follow-up/continuation SR)
    - Body: `{ followup_reason, description, technician_id?, scheduled_date? }`
    - Only allowed when parent is IN_PROGRESS or RESOLVED
    - Inherits company, asset, client, channel, and type from parent
    - Auto-assigns SCHEDULED status if a technician is set
  - `GET /v1/service-requests/:id/chain` (get the full history chain)
    - Walks up to the root and returns all related SRs ordered oldest → newest
    - Response: `{ original_id, total, chain: [...] }`
  - `POST /v1/service-requests/:id/client-media` (upload media for client)
  - `POST /v1/service-requests/:id/technician-media` (upload media for technician)

- **Technicians**
  - `POST /v1/technicians` (create technician)
  - `GET /v1/technicians` (list all technicians)
  - `GET /v1/technicians/company/:companyId` (list by company)
  - `GET /v1/technicians/:id/service-requests` (list requests for technician)

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
| `service_request.updated` | Emitted when a service request is updated | `{ id, status, technicianId?, scheduledDate?, updatedAt }` |
| `service_request.rescheduled` | Emitted when `scheduled_date` changes | `{ id, status, technicianId?, scheduledDate, previousDate, updatedAt }` |
| `service_request.followup_created` | Emitted when a follow-up SR is created | `{ id, parentId, status, createdAt }` |
| `service_request.rated` | Emitted when a client submits a rating | `{ id, rating_score, ratedAt }` |

### Closing Connection

```javascript
// Close the connection when component unmounts or user logs out
eventSource.close();
```

### CORS Configuration

The SSE endpoint is configured to accept connections. For production, ensure your gateway matches the relevant origins.

## Development Workflow

1. Start PostgreSQL: `./scripts/dev.sh` (from project root)
2. Open VS Code Dev Container
3. Install dependencies: `npm ci`
4. Run migrations: `npm run migration:run`
5. Optionally seed: `npm run seed`
6. Start dev server: `npm run start:dev`
7. Hit health check and APIs

Note: By default service requests are rate limited to 5 per asset per IP per hour. To change this, modify `maxRequests` in `src/common/utils/rate-limiter`.

## Production Dockerfile

The `backend/Dockerfile` builds a production-ready image. When used via the `qa` Docker Compose profile, the container automatically:

1. Waits for PostgreSQL to be healthy
2. Runs all pending migrations
3. Seeds sample data (if `RUN_SEED=true`)
4. Starts the NestJS app with `node dist/main`

## Folder Structure (high-level)

```
src/
  app.module.ts
  main.ts
  config/              # Validated config module
  health/              # Health check endpoint
  entities/            # TypeORM entities
  migrations/          # DB migrations
  seeds/               # Database seeding
  common/utils/        # QR token generator, cursor pagination, rate-limiter
  modules/
    companies/
    assets/
    clients/
    intake/
    service-requests/
    technicians/
    auth/
    realtime/
```

## QR Tokens

- Generated using a URL-safe random ID (24 chars)
- Unique constraint with retry on collisions
- Public resolver endpoint maps token to limited asset data

## Pagination

- Cursor-based by default for service-requests, sorted by `createdAt` desc, then `id` desc
- Use `nextCursor` from response to fetch next page

## Troubleshooting

- **App fails at boot with config errors** — verify `.env` keys and types
- **Health check shows `db: "down"`** — verify `DATABASE_URL` / `DB_HOST`, check Postgres is reachable
- **Migrations fail with permissions** — ensure your DB user has CREATE/ALTER
- **429 Too Many Requests on public intake** — in-memory rate limit (resets in ~1 hour or on restart)
- **UUID default missing (`gen_random_uuid`)** — ensure pgcrypto or appropriate extension is available

For Docker setup, scripts, and infrastructure, see the [root README](../README.md).
