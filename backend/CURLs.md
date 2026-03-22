# Useful CURLs

## Database Health

```bash
curl http://localhost:3000/health
```

#### Response

```json
{
  "ok": true or false,
  "db": "up" or "down",
  "timestamp": "Date (ISO 8061)"
}
```

## Authentication

### Login

Used to obtain a JWT token for use in other requests.

```bash
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "operator",
    "password": "operator123"
  }'
```

#### Response

```json
{
  "access_token": "your.long.jwt.token"
}
```

### Get User Profile

Verifies that the JWT token is valid and returns user information.

```bash
curl http://localhost:3000/v1/auth/profile \
  -H "Authorization: Bearer <your_access_token>"
```

#### Response

```json
{
  "userId": "User ID (UUID)",
  "username": "operator",
  "role": "OPERATOR",
  "companyId": "Company ID (UUID)",
  "technicianId": null
}
```

## Companies

### Creating Company (Guarded)

```bash
curl -X POST http://localhost:3000/v1/companies \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Company Name",
    "logo_url": "https://example.com/logo.png",
    "primary_color": "#HEXCOLOR"
  }'
```

#### Response

```json
{
  "id": "Company ID (UUID)",
  "name": "Company Name",
  "logo_url": "https://example.com/logo.png",
  "primary_color": "#HEXCOLOR",
  "created_at": "Date (ISO 8601)",
  "updated_at": "Date (ISO 8601)"
}
```

### Get Company by ID (Guarded)

```bash
curl http://localhost:3000/v1/companies/<company_id> \
  -H "Authorization: Bearer <your_access_token>"
```

#### Response

```json
{
  "id": "Company ID (UUID)",
  "name": "Company Name",
  "logo_url": "https://example.com/logo.png",
  "primary_color": "#HEXCOLOR",
  "created_at": "Date (ISO 8601)",
  "updated_at": "Date (ISO 8601)"
}
```

### List Companies (Guarded)

```bash
curl http://localhost:3000/v1/companies \
  -H "Authorization: Bearer <your_access_token>"
```

#### Response

```json
[
  {
    "id": "Company ID (UUID)",
    "name": "Company Name",
    "logo_url": "https://example.com/logo.png",
    "primary_color": "#HEXCOLOR",
    "created_at": "Date (ISO 8601)",
    "updated_at": "Date (ISO 8601)"
  }
]
```

## Assets

### Creating Asset (Guarded + Operator Role Required)

```bash
curl -X POST http://localhost:3000/v1/assets \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "Company ID (UUID)",
    "name": "Product Name",
    "model": "Product Model",
    "serial_number": "Serial Number",
    "location_address": "Location Address",
    "location_lat": 37.7749,
    "location_lng": -122.4194
  }'
```

#### Response

```json
{
  "id": "Asset ID (UUID)",
  "company_id": "Company ID (UUID)",
  "name": "Product Name",
  "model": "Product Model",
  "serial_number": "Serial Number",
  "location_address": "Location Address",
  "location_lat": 0, // Longitude
  "location_lng": 0, // Latitude
  "qr_token": "QR Token (24 URL-safe chars)",
  "created_at": "Date (ISO 8601)"
}
```

### Get Asset by ID (Guarded)

```bash
curl http://localhost:3000/v1/assets/<assetId> \
  -H "Authorization: Bearer <your_access_token>"
```

#### Response

```json
{
  "id": "Asset ID (UUID)",
  "company_id": "Company ID (UUID)",
  "name": "Product Name",
  "model": "Product Model",
  "serial_number": "Serial Number",
  "location_address": "Location Address",
  "location_lat": 0, // Latitude
  "location_lng": 0, // Longitude
  "qr_token": "QR Token (24 URL-safe chars)",
  "created_at": "Date (ISO 8601)"
}
```

### Get Asset QR Token + Intake URL (Guarded)

```bash
curl -X POST http://localhost:3000/v1/assets/<assetId>/qr \
  -H "Authorization: Bearer <your_access_token>"
```

#### Response

```json
{
  "qr_token": "QR Token (24 URL-safe chars)",
  "intakeUrl": "https://your-frontend.com/i/<qr_token>"
}
```

### Public: Resolve Asset by QR Token

```bash
curl http://localhost:3000/v1/public/qr/asset/<qr_token>
```

#### Response

```json
{
  "id": "Asset ID (UUID)",
  "name": "Product Name",
  "model": "Product Model",
  "location": {
    "city": "City or area (approx)",
    "lat": 37.7749,
    "lng": -122.4194
  }
}
```

## Public Intake (Create Service Request)

### Create Request via QR Token

```bash
curl -X POST http://localhost:3000/v1/public/intake/<qr_token>/request \
  -H "Content-Type: application/json" \
  -d '{
    "type": "MAINTENANCE",
    "description": "Describe the issue or maintenance request (10–2000 chars).",
    "contact": {
      "name": "Your Name",
      "email": "you@example.com",
      "phone": "+1-555-0123"
    },
    "media": [
      { "url": "https://example.com/photo.jpg", "kind": "image" }
    ]
  }'
```

#### Response

```json
{
  "requestId": "Service Request ID (UUID)",
  "created_at": "Date (ISO 8601)",
  "message": "Service request created successfully. We will get back to you soon."
}
```

### (Optional) Check Rate Limit Status for a Token

```bash
curl http://localhost:3000/v1/public/intake/<qr_token>/status
```

#### Response

```json
{
  "remaining": 3,
  "resetIn": "1 hour"
}
```

## Operator: Service Requests

### List Service Requests (Guarded)

```bash
# Basic (latest first, default limit=20)
curl "http://localhost:3000/v1/service-requests" \
  -H "Authorization: Bearer <your_access_token>"

# Filter by single status
curl "http://localhost:3000/v1/service-requests?status=PENDING" \
  -H "Authorization: Bearer <your_access_token>"

# Filter by multiple statuses
curl "http://localhost:3000/v1/service-requests?status=PENDING&status=ASSIGNED" \
  -H "Authorization: Bearer <your_access_token>"

# Date range (inclusive). Use ISO 8601 dates (YYYY-MM-DD).
curl "http://localhost:3000/v1/service-requests?from=2025-11-01&to=2025-11-30" \
  -H "Authorization: Bearer <your_access_token>"

# Limit page size
curl "http://localhost:3000/v1/service-requests?limit=10" \
  -H "Authorization: Bearer <your_access_token>"

# Use cursor from previous response to fetch next page
curl "http://localhost:3000/v1/service-requests?cursor=<nextCursor>&limit=10" \
  -H "Authorization: Bearer <your_access_token>"
```

#### Response

```json
{
  "items": [
    {
      "id": "Service Request ID (UUID)",
      "created_at": "Date (ISO 8601)",
      "type": "MAINTENANCE",
      "status": "PENDING",
      "descriptionPreview": "First ~100 chars...",
      "asset": {
        "id": "Asset ID (UUID)",
        "name": "Asset Name",
        "model": "Asset Model"
      },
      "client": {
        "id": "Client ID (UUID)",
        "name": "Client Name",
        "email": "client@example.com"
      }
    }
  ],
  "nextCursor": "Base64 cursor or null",
  "hasMore": true,
  "count": 1
}
```

### Get Service Request by ID (Guarded)

```bash
curl http://localhost:3000/v1/service-requests/<serviceRequestId> \
  -H "Authorization: Bearer <your_access_token>"
```

#### Response

```json
{
  "id": "Service Request ID (UUID)",
  "created_at": "Date (ISO 8601)",
  "updated_at": "Date (ISO 8601)",
  "type": "MAINTENANCE",
  "status": "PENDING",
  "channel": "QR",
  "description": "Full description",
  "client_media": [{ "url": "https://example.com/photo.jpg", "kind": "image" }],
  "technician_media": [{ "url": "https://example.com/tech_photo.jpg", "kind": "image" }],
  "asset": {
    "id": "Asset ID (UUID)",
    "name": "Asset Name",
    "model": "Asset Model",
    "serial_number": "Serial Number",
    "location_address": "Location Address",
    "location_lat": 37.7749,
    "location_lng": -122.4194
  },
  "client": {
    "id": "Client ID (UUID)",
    "name": "Client Name",
    "email": "client@example.com",
    "phone": "+1-555-0123"
  },
  "technician_id": "Technician ID (UUID)",
  "technician_notes": "Note content",
  "scheduled_date": "2025-12-25T10:00:00Z"
}
```

## Technicians

### Create Technician (Guarded)

```bash
curl -X POST http://localhost:3000/v1/technicians \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "Company ID (UUID)",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1-555-0123",
  }'
```

#### Response

```json
{
  "id": "Technician ID (UUID)",
  "company_id": "Company ID (UUID)",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1-555-0123",
  "created_at": "Date (ISO 8601)",
  "updated_at": "Date (ISO 8601)"
}
```

### List All Technicians (Guarded)

```bash
curl http://localhost:3000/v1/technicians \
  -H "Authorization: Bearer <your_access_token>"
```

#### Response

```json
[
  {
    "id": "Technician ID (UUID)",
    "company_id": "Company ID (UUID)",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1-555-0123",
    "created_at": "Date (ISO 8601)",
    "updated_at": "Date (ISO 8601)"
  }
]
```

### Get Technicians by Company (Guarded)

```bash
curl http://localhost:3000/v1/technicians/company/<company_id> \
  -H "Authorization: Bearer <your_access_token>"
```

#### Response

```json
[
  {
    "id": "Technician ID (UUID)",
    "company_id": "Company ID (UUID)",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1-555-0123",
    "skills": ["HVAC", "Electrical"],
    "created_at": "Date (ISO 8601)",
    "updated_at": "Date (ISO 8601)"
  }
]
```

### Get Service Requests by Technician (Guarded)

```bash
curl http://localhost:3000/v1/technicians/<technician_id>/service-requests \
  -H "Authorization: Bearer <your_access_token>"
```

#### Response

Same format as [List Service Requests](#list-service-requests-with-filters--cursor-pagination)


## Service Request Management

### Update Service Request (Guarded)

```bash
curl -X PATCH http://localhost:3000/v1/service-requests/<serviceRequestId> \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ASSIGNED",
    "technician_id": "Technician ID (UUID)",
    "technician_notes": "Contacted customer. Will visit tomorrow at 10AM.",
    "scheduled_date": "2025-12-25T10:00:00Z"
  }'
```

**Valid statuses**: `PENDING`, `ASSIGNED`, `SCHEDULED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`

#### Response

```json
{
  "id": "Service Request ID (UUID)",
  "status": "ASSIGNED",
  "technician_id": "Technician ID (UUID)",
  "technician_notes": "Contacted customer. Will visit tomorrow at 10AM.",
  "scheduled_date": "2025-12-25T10:00:00.000Z",
  "updated_at": "Date (ISO 8601)"
}
```

### Upload Client Media (Guarded)

```bash
curl -X POST http://localhost:3000/v1/service-requests/<serviceRequestId>/client-media \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: multipart/form-data" \
  -F "files=@/path/to/image.jpg"
```

#### Response

```json
[
  {
    "url": "/uploads/files-123456789.jpg",
    "kind": "image"
  }
]
```

### Upload Technician Media (Guarded)

```bash
curl -X POST http://localhost:3000/v1/service-requests/<serviceRequestId>/technician-media \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: multipart/form-data" \
  -F "files=@/path/to/image.jpg"
```

#### Response

```json
[
  {
    "url": "/uploads/files-123456789.jpg",
    "kind": "image"
  }
]
```

### Filter Service Requests by Technician (Guarded)

```bash
# Get all service requests assigned to a specific technician
curl "http://localhost:3000/v1/service-requests?technicianId=<technician_id>" \
  -H "Authorization: Bearer <your_access_token>"

# Combine with status filter
curl "http://localhost:3000/v1/service-requests?technicianId=<technician_id>&status=IN_PROGRESS" \
  -H "Authorization: Bearer <your_access_token>"
```

#### Response

Same format as [List Service Requests](#list-service-requests-with-filters--cursor-pagination)
 
 
 ## Realtime Updates
 
 The system provides realtime updates for service requests using Server-Sent Events (SSE).
 
 ### SSE Stream (Guarded)
 
 This endpoint provides a continuous stream of events for the operator's company.
 
 ```bash
 curl -N --no-buffer http://localhost:3000/v1/realtime/stream \
   -H "Authorization: Bearer <your_access_token>"
 ```
 
 #### Event Format
 
 The stream sends `MessageEvent` objects. Each event has a `data` field containing the update.
 
 ```json
 {
   "data": {
     "id": "Service Request ID (UUID)",
     "status": "ASSIGNED",
     "updated_at": "Date (ISO 8601)",
     ...
   }
 }
 ```
 
 ### WebSockets (Socket.IO)
 
 For interactive applications or node-based testing, WebSockets are available via Socket.IO.
 
 You can use the provided test client to see events as they happen:
 
 ```bash
 # Usage: node test-websocket.js <company_id>
 node test-websocket.js 123e4567-e89b-12d3-a456-426614174000
 ```
 
 **WebSocket Server**: `http://localhost:3000`
 **Events**:
 - `joinRoom`: Emit this with `company:<company_id>` to join a company-specific room.
 - `service-request.updated`: Listen for this event to receive updates.
