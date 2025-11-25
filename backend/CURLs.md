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

## Companies

### Creating Company

```bash
curl -X POST http://localhost:3000/v1/companies \
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

### Get Company by ID

```bash
curl http://localhost:3000/v1/companies/<company_id>
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

### List Companies

```bash
curl http://localhost:3000/v1/companies
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

### Creating Asset

```bash
curl -X POST http://localhost:3000/v1/assets \
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

### Get Asset by ID

```bash
curl http://localhost:3000/v1/assets/<assetId>
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

### Get Asset QR Token + Intake URL

```bash
curl -X POST http://localhost:3000/v1/assets/<assetId>/qr
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

### List Service Requests (with filters + cursor pagination)

```bash
# Basic (latest first, default limit=20)
curl "http://localhost:3000/v1/service-requests"

# Filter by single status
curl "http://localhost:3000/v1/service-requests?status=PENDING"

# Filter by multiple statuses
curl "http://localhost:3000/v1/service-requests?status=PENDING&status=ASSIGNED"

# Date range (inclusive). Use ISO 8601 dates (YYYY-MM-DD).
curl "http://localhost:3000/v1/service-requests?from=2025-11-01&to=2025-11-30"

# Limit page size
curl "http://localhost:3000/v1/service-requests?limit=10"

# Use cursor from previous response to fetch next page
curl "http://localhost:3000/v1/service-requests?cursor=<nextCursor>&limit=10"
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

### Get Service Request by ID (full details)

```bash
curl http://localhost:3000/v1/service-requests/<serviceRequestId>
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
  "media": [{ "url": "https://example.com/photo.jpg", "kind": "image" }],
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
  }
}
```

## Technicians

### Create Technician

```bash
curl -X POST http://localhost:3000/technicians \
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

### List All Technicians

```bash
curl http://localhost:3000/technicians
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

### Get Technicians by Company

```bash
curl http://localhost:3000/technicians/company/<company_id>
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

## Service Request Management

### Update Service Request Status

```bash
curl -X PATCH http://localhost:3000/v1/service-requests/<serviceRequestId>/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ASSIGNED"
  }'
```

**Valid statuses**: `PENDING`, `ASSIGNED`, `SCHEDULED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`

#### Response

```json
{
  "id": "Service Request ID (UUID)",
  "status": "ASSIGNED",
  "updated_at": "Date (ISO 8601)"
}
```

### Assign Technician to Service Request

```bash
curl -X PATCH http://localhost:3000/v1/service-requests/<serviceRequestId>/assign \
  -H "Content-Type: application/json" \
  -d '{
    "technician_id": "Technician ID (UUID)"
  }'
```

#### Response

```json
{
  "id": "Service Request ID (UUID)",
  "technician_id": "Technician ID (UUID)",
  "status": "ASSIGNED",
  "updated_at": "Date (ISO 8601)"
}
```

### Add/Update Technician Notes

```bash
curl -X PATCH http://localhost:3000/v1/service-requests/<serviceRequestId>/technician-notes \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Contacted customer. Will visit tomorrow at 10AM."
  }'
```

#### Response

```json
{
  "id": "Service Request ID (UUID)",
  "technician_notes": "Contacted customer. Will visit tomorrow at 10AM.",
  "updated_at": "Date (ISO 8601)"
}
```

### Filter Service Requests by Technician

```bash
# Get all service requests assigned to a specific technician
curl "http://localhost:3000/v1/service-requests?technicianId=<technician_id>"

# Combine with status filter
curl "http://localhost:3000/v1/service-requests?technicianId=<technician_id>&status=IN_PROGRESS"
```

#### Response

Same format as [List Service Requests](#list-service-requests-with-filters--cursor-pagination)
