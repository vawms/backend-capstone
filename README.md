# Backend Capstone: Dev and Docker

## TODO
When a technician does not finish a job or further work needs to be done he can open a new issue to come back later. 
The technician should be able to access previous jobs done at that site to determine its history.

This is the top-level entry for running the backend using Docker and/or a Dev Container. For API usage, scripts, and detailed developer workflows, see the README inside ./backend.

## What’s Included

- NestJS backend in ./backend
- PostgreSQL (via Docker Compose)
- Real-time updates via SSE (Server-Sent Events)
- Technician management and workflows
- Media upload (local storage)
- Optional MinIO service (planned/optional)
- Dev Container configuration for VS Code

## Prerequisites

- Docker Desktop or Docker Engine
- Docker Compose v2
- VS Code with “Dev Containers” & "Container Tools" extensions

## Quick Start with Docker Compose

1. Copy or export environment variables used by the backend. The backend service expects at least DATABASE_URL and PORT. The compose file typically sets these for you via env or defaults.

Example .env at repo (/backend-capstone) root & /backend-capstone/backend for good measure:

```text
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=smart_service
POSTGRES_PORT=5432

# Backend app
PORT=3000
DATABASE_URL=postgres://postgres:postgres@db:5432/smart_service
NODE_ENV=development
```

2. Start the stack:

```bash
cd infra
docker compose up --build
```

This brings up:

- db: PostgreSQL

Then open up VS Code and start the Dev Container and run this inside a VS Code terminal:
```bash
npm ci
npm install
```


3. Apply migrations:

```bash
npm run migration:run
```

4. Run the application:

```bash
npm run start:dev
```

5. Health check:

```bash
curl http://localhost:3000/health
```

You should see db: "up".

6. Optional: seed data (Fill up the database with some data for testing)

```bash
npm run seed
```

### Common Docker Commands

```bash
# Start docker compose
docker compose up --build

# Stop
docker compose down

# Clean volumes (removes database data)
docker compose down -v
```

## Networking and Environment

- The backend uses DATABASE_URL. In Docker, use the service name of Postgres (commonly db) as host: `postgres://user:pass@db:5432/smart_service`.
- Exposed ports:
  - API: 3000 → localhost:3000
  - Postgres: 5432 → postgres:5432 


## Where to Find API and NPM Instructions

For detailed npm scripts, migrations, seeding, endpoint descriptions, DTO rules, and troubleshooting:

- See ./backend/README.md

This includes:

- How to run the NestJS app locally without Docker
- Healthcheck endpoint
- Companies, Assets, Public Intake, and Service Requests endpoints
- Pagination and rate-limiting details

## Troubleshooting

- api container fails to connect to db:

  - Ensure DATABASE_URL uses host db (the Compose service name), not localhost.
  - Verify db logs: `docker compose logs -f db`

- Migrations fail inside container:

  - Run them explicitly: `npm run migration:run`
  - Ensure your entities are included and paths match container filesystem

- Port conflict on 3000/5432:

  - Change published ports in docker-compose.yml or set PORT environment variable

- Data persistence:
  - Compose uses a volume for Postgres data. Use `docker compose down -v` to reset.

## Other

For development and API usage, continue in ./backend.
