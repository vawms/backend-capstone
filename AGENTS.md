# AGENTS.md

## Project Overview

A multi-tenant NestJS backend for a smart service-request system. Companies create assets (e.g., servers, routers, A/C units) with QR codes; clients scan a QR code to submit service requests; operators assign technicians; technicians update status. Service requests can be chained into follow-up sequences.

All work is under `backend/`. Commands below assume `cd backend` first.

## Commands

```bash
# Install
npm ci

# Dev server (hot reload)
npm run start:dev

# Build
npm run build

# Lint (auto-fix)
npm run lint

# Tests
npm test                        # unit tests (Jest)
npm run test:watch              # watch mode
npm run test:cov                # with coverage
npm run test:e2e                # end-to-end

# Database
npm run migration:generate -- src/migrations/<MigrationName>   # generate from entity diff
npm run migration:run           # apply pending migrations
npm run migration:revert        # revert last migration
npm run seed                    # seed sample data (TechCorp company, assets, users)
```

## Architecture

### Module Structure (`src/modules/`)

| Module | Responsibility |
|---|---|
| `auth` | JWT + Passport (local + jwt strategies), bcrypt, `JwtAuthGuard`, `RolesGuard` |
| `companies` | Multi-tenant root; every other entity is scoped to a `company_id` |
| `assets` | Equipment items; each has a URL-safe 24-char nanoid QR token |
| `clients` | End users who submit requests via QR scan |
| `technicians` | Field workers; linked to a `User` with `TECHNICIAN` role |
| `service-request` | Core domain — create, assign, update, follow-up chains, media, filtering |
| `intake` | **Public** endpoints (no auth) rate-limited to 5 req/asset/IP/hour via QR token |
| `realtime` | SSE (`/v1/realtime/events`) for live operator/technician updates |
| `mail` | Nodemailer-based notifications triggered on status changes |

### Auth Flow

JWT strategy reads `{ sub, username, role, company_id, technician_id }` from token. Apply `@UseGuards(JwtAuthGuard)` to protect routes; use `@Roles(UserRole.OPERATOR)` + `RolesGuard` for role restrictions. Token expiry: 60 min.

### Service Request Chains

`ServiceRequest` has a nullable `parent_id` (self-reference). A follow-up is a new `ServiceRequest` pointing to its predecessor. The `service-request-chain.dto.ts` DTO exposes the full lineage. Status flow: `PENDING → SCHEDULED → IN_PROGRESS → RESOLVED/CANCELLED`.

### Database

- PostgreSQL 13+ via TypeORM 0.3.x
- `synchronize: false` — always use migrations, never entity auto-sync
- Migration files live in `src/migrations/`; ORM config in `src/ormconfig.ts`
- UUID PKs via `gen_random_uuid()`; composite indexes on `(company_id, created_at)` for tenant-scoped queries
- Pagination is cursor-based (pass `cursor` query param)

### Environment Variables

```
DB_HOST / DB_PORT / DB_USERNAME / DB_PASSWORD / DB_DATABASE
DATABASE_URL   # used by migration CLI
JWT_SECRET
PORT           # default 3000
NODE_ENV
# Optional SMTP for mail module:
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM
RUN_SEED       # set "true" in QA Docker to auto-seed on startup
```

### Running Locally

The project ships a Dev Container (`.devcontainer/`). Alternatively, a `docker-compose.yml` in the repo root spins up Postgres + the app for QA. The health check is `GET /v1/health`.
