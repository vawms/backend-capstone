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
  - GET /v1/service-requests/:id (full details)
  - PATCH /v1/service-requests/:id/status (update status)
  - PATCH /v1/service-requests/:id/assign (assign technician)
  - PATCH /v1/service-requests/:id/technician-notes (add/update notes)

- Technicians
  - POST v1/technicians (create technician)
  - GET v1/technicians (list all technicians)
  - GET v1/technicians/company/:companyId (list by company)

## WebSocket Real-Time Events

The backend uses **Socket.IO** for real-time updates. This allows the operator dashboard to receive instant notifications when service requests are created or updated without polling.

### Connection

Connect to the WebSocket server at the same base URL as your API:

```javascript
// Using Socket.IO client library
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
});

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
  console.log('Socket ID:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Disconnected from WebSocket server');
});
```

### Joining Rooms

To receive events for a specific company, join the company's room:

```javascript
// Join a company room to receive updates for that company
const companyId = 'your-company-uuid';
socket.emit('joinRoom', `company:${companyId}`, (response) => {
  console.log('Joined room:', response);
  // Response: { event: 'joinedRoom', room: 'company:your-company-uuid' }
});
```

### Listening to Events

Once joined to a company room, listen for service request updates:

```javascript
// Listen for service request updates
socket.on('service-request.updated', (data) => {
  console.log('Service request updated:', data);
  
  // Data structure:
  // {
  //   id: 'service-request-uuid',
  //   status: 'PENDING' | 'ASSIGNED' | 'SCHEDULED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED',
  //   technician_id: 'technician-uuid' (if assigned),
  //   updated_at: '2025-11-25T09:30:00.000Z'
  // }
  
  // Update your UI with the new data
  updateServiceRequestInUI(data);
});
```

### Leaving Rooms

When navigating away or cleaning up:

```javascript
// Leave a company room
socket.emit('leaveRoom', `company:${companyId}`, (response) => {
  console.log('Left room:', response);
  // Response: { event: 'leftRoom', room: 'company:your-company-uuid' }
});

// Disconnect when done
socket.disconnect();
```

### Complete Example (HTML + JavaScript)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Service Request Dashboard</title>
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
</head>
<body>
  <h1>Service Request Dashboard</h1>
  <div id="status">Disconnected</div>
  <div id="events"></div>

  <script>
    const socket = io('http://localhost:3000');
    const companyId = 'your-company-uuid'; // Replace with actual company ID
    
    socket.on('connect', () => {
      document.getElementById('status').textContent = 'Connected ✓';
      
      // Join the company room
      socket.emit('joinRoom', `company:${companyId}`);
    });
    
    socket.on('disconnect', () => {
      document.getElementById('status').textContent = 'Disconnected ✗';
    });
    
    socket.on('service-request.updated', (data) => {
      const eventsDiv = document.getElementById('events');
      const eventItem = document.createElement('div');
      eventItem.innerHTML = `
        <strong>Service Request ${data.id}</strong><br>
        Status: ${data.status}<br>
        Updated: ${new Date(data.updated_at).toLocaleString()}<br>
        ${data.technician_id ? `Technician: ${data.technician_id}` : ''}
        <hr>
      `;
      eventsDiv.prepend(eventItem);
    });
  </script>
</body>
</html>
```

### Events Emitted by Server

| Event Name | Description | Data Structure |
|------------|-------------|----------------|
| `service-request.updated` | Emitted when a service request is created, status updated, technician assigned, or notes added | `{ id, status, technician_id?, updated_at }` |

### Installation (Client)

To use Socket.IO in your frontend application:

**NPM/Yarn:**
```bash
npm install socket.io-client
# or
yarn add socket.io-client
```

**CDN (Browser):**
```html
<script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
```

### CORS Configuration

The WebSocket server is configured to accept connections from any origin (`*`). For production, you should restrict this to your frontend domain(s) in the gateway configuration file.



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
