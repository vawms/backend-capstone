# Smart Service — Field Service Management Backend

## About

Smart Service is a backend API for managing field service operations. It connects companies with their physical assets (servers, routers, HVAC units, etc.) and streamlines the workflow from service request intake through technician assignment and resolution.

**How it works:** Each asset gets a unique QR code. When someone scans the QR code, they're taken to a public intake form where they can submit a service request describing the issue. Operators see incoming requests in real time via Server-Sent Events, assign technicians, schedule work, and track progress through a defined status lifecycle (Pending → Assigned → Scheduled → In Progress → Resolved → Closed).

**Key capabilities:**
- **QR-based intake** — Clients scan an asset's QR code and submit service requests without needing an account
- **Multi-tenant** — All data is scoped by company
- **Real-time updates** — SSE pushes status changes to operator dashboards and technician views instantly
- **Technician management** — Create technicians, assign them to requests, track their workload
- **Media attachments** — Both clients and technicians can upload photos/files to service requests
- **JWT authentication** — Role-based access for operators and technicians

## TODO

- When a technician does not finish a job or further work needs to be done, they can open a new issue to come back later
- The technician should be able to access previous jobs done at a site to determine its history

## What's Included

- NestJS backend in `./backend`
- PostgreSQL (via Docker Compose)
- Real-time updates via SSE (Server-Sent Events)
- Technician management and workflows
- Media upload (local storage)
- JWT authentication (operator and technician roles)
- Optional MinIO and Redis services (planned)
- Dev Container configuration for VS Code

## Prerequisites

- Docker Desktop or Docker Engine
- Docker Compose v2
- (Development only) VS Code with the "Dev Containers" extension

## Docker Compose Profiles

The project uses **Docker Compose profiles** to support two workflows:

| Profile | What starts | Use case |
|---------|-------------|----------|
| `dev`   | PostgreSQL only | Day-to-day development inside a VS Code Dev Container |
| `qa`    | PostgreSQL + Backend (containerized) | QA testing, demos, CI — fully automated startup |

## Quick Start: Development

Run the helper script from the project root:

```bash
./scripts/dev.sh
```

This will:
1. Copy `.env.example` to `.env` if no `.env` exists
2. Start PostgreSQL on `localhost:5432`

Then open the project in VS Code and reopen inside the Dev Container (`Ctrl+Shift+P` → *Dev Containers: Reopen in Container*). Inside the Dev Container terminal:

```bash
cd backend
npm run migration:run
npm run seed              # optional — loads sample data
npm run start:dev
```

Verify:

```bash
curl http://localhost:3000/health
# → { "ok": true, "db": "up", ... }
```

## Quick Start: QA / Testing

Run the helper script from the project root:

```bash
./scripts/qa.sh
```

This will:
1. Copy `.env.example` to `.env` if no `.env` exists
2. Build the backend Docker image
3. Start PostgreSQL and wait for it to be healthy
4. Run database migrations automatically
5. Seed sample data (set `RUN_SEED=false` to skip)
6. Start the NestJS API on `localhost:3000`

To skip seeding:

```bash
RUN_SEED=false ./scripts/qa.sh
```

View backend logs:

```bash
cd infra && docker compose --profile qa logs -f backend
```

Verify:

```bash
curl http://localhost:3000/health
```

### QA Seed Credentials

| Role       | Username / Email       | Password    |
|------------|------------------------|-------------|
| Operator   | `operator`             | `operator123` |
| Technician | `sarah.m@techcorp.com` | `tech123`   |
| Technician | `james.t@techcorp.com` | `tech123`   |
| Technician | `emily.c@techcorp.com` | `tech123`   |

## Stopping Services

```bash
# Stop all containers (preserves database data)
./scripts/stop.sh

# Stop all containers AND delete database volumes
./scripts/stop.sh --clean
```

## Environment Variables

Copy `.env.example` to `.env` at the project root (and optionally into `./backend/.env`). Key variables:

```text
# PostgreSQL container
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=smart_service
POSTGRES_PORT=5432

# Backend app
PORT=3000
DATABASE_URL=postgres://postgres:postgres@postgres:5432/smart_service
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=smart_service
NODE_ENV=development
JWT_SECRET=super-secret

# QA only
RUN_SEED=false
```

> Inside Docker Compose the PostgreSQL hostname is `postgres` (the service name). The Dev Container joins the same Docker network (`infra_default`), so the same hostname works there too.

## Networking

- The Docker Compose default network is `infra_default`
- The Dev Container joins this network via `--network=infra_default` (configured in `.devcontainer/devcontainer.json`)
- Exposed ports:
  - **API**: `3000` → `localhost:3000`
  - **PostgreSQL**: `5432` → `localhost:5432`

## API and Developer Documentation

For detailed endpoint descriptions, DTO rules, npm scripts, migrations, seeding, and SSE real-time events:

→ See [`./backend/README.md`](./backend/README.md)

## Troubleshooting

- **Backend cannot connect to the database**
  - Ensure `DB_HOST` / `DATABASE_URL` uses `postgres` (the Compose service name), not `localhost`
  - Check Postgres logs: `cd infra && docker compose --profile dev logs -f postgres`

- **Migrations fail**
  - Run them explicitly: `npm run migration:run`
  - Ensure the database is up and reachable

- **Port conflict on 3000 or 5432**
  - Change the published ports in `infra/docker-compose.yaml` or set `PORT` in `.env`

- **QA backend container exits immediately**
  - Check logs: `cd infra && docker compose --profile qa logs backend`
  - Common cause: Postgres not yet healthy — the entrypoint retries automatically

- **Data persistence**
  - Docker Compose uses a named volume (`pgdata`) for Postgres. Use `./scripts/stop.sh --clean` to reset.

- **429 Too Many Requests on public intake**
  - The in-memory rate limiter allows 5 requests per asset per IP per hour. Restart the backend to reset.
