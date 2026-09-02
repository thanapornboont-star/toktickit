# Lab 2 REST API Specification - TokTickIT

## 1. Global API Conventions

- **Base URL**: `/api`
- **Protocol**: HTTP/1.1 over JSON (and `multipart/form-data` for file uploads)
- **Requester Header**: `X-Dev-Requester-Id` (Integer ID of the currently selected active Development Requester)
- **Idempotency**: Optional `Idempotency-Key` header for create operations.
- **Timestamps**: ISO 8601 UTC strings (`YYYY-MM-DDTHH:mm:ss.sssZ`).
- **Ownership Policy (404 Not Found)**:
  - If a requester queries an individual ticket or attachment ID that belongs to another requester or does not exist, the API must return `404 Not Found` with `{ "error": { "code": "NOT_FOUND", "message": "Ticket not found" } }`.
- **Standard Error Response Format**:
```json
{
  "error": {
    "code": "BAD_REQUEST | NOT_FOUND | FORBIDDEN | CONFLICT | PAYLOAD_TOO_LARGE | UNSUPPORTED_MEDIA_TYPE | INTERNAL_SERVER_ERROR",
    "message": "Human readable error description",
    "details": {}
  }
}
```

---

## 2. Reference Endpoints

### 2.1 GET `/api/dev-requesters`
Returns all active Development Requesters for the selector screen. Inactive requesters are excluded.

- **Headers**: None required
- **Success (200 OK)**:
```json
[
  {
    "id": 1,
    "name": "Jennifer Anderson",
    "email": "jennifer.anderson@toktickit.local",
    "department": "Human Resources",
    "isActive": true
  },
  {
    "id": 2,
    "name": "Michael Brown",
    "email": "michael.brown@toktickit.local",
    "department": "Finance",
    "isActive": true
  },
  {
    "id": 3,
    "name": "Sarah Johnson",
    "email": "sarah.johnson@toktickit.local",
    "department": "Marketing",
    "isActive": true
  },
  {
    "id": 4,
    "name": "David Lee",
    "email": "david.lee@toktickit.local",
    "department": "Engineering",
    "isActive": true
  }
]
```

### 2.2 GET `/api/categories`
Returns all active ticket categories.

- **Headers**: None required
- **Success (200 OK)**:
```json
[
  { "id": 1, "name": "Account and Access", "isActive": true },
  { "id": 2, "name": "Hardware", "isActive": true },
  { "id": 3, "name": "Software", "isActive": true },
  { "id": 4, "name": "Network", "isActive": true }
]
```

### 2.3 GET `/api/related-systems`
Returns all active related systems/services.

- **Headers**: None required
- **Success (200 OK)**:
```json
[
  { "id": 1, "name": "Corporate Laptop", "description": "Laptops and accessories", "isActive": true },
  { "id": 2, "name": "Email", "description": "Corporate mailbox & Outlook", "isActive": true },
  { "id": 3, "name": "Campus Wi-Fi", "description": "Wireless network connectivity", "isActive": true },
  { "id": 4, "name": "VPN", "description": "Secure remote access", "isActive": true },
  { "id": 5, "name": "LEB2 App", "description": "Learning platform", "isActive": true },
  { "id": 6, "name": "Grade Submission App", "description": "Academic grading system", "isActive": true },
  { "id": 7, "name": "Printer", "description": "Office and network printers", "isActive": true }
]
```

---

## 3. Ticket Endpoints

### 3.1 POST `/api/tickets`
Creates a new IT Support Ticket. The requester identity is obtained from `X-Dev-Requester-Id`. The request body must not contain `ticketNumber`, `status`, or `requesterId`.

- **Headers**:
  - `X-Dev-Requester-Id`: `1` (Required)
  - `Content-Type`: `application/json`
  - `Idempotency-Key`: `string` (Optional)
- **Request Body**:
```json
{
  "summary": "Cannot connect to VPN from home office",
  "description": "Getting error 800 when attempting to connect to corporate VPN gateway since morning.",
  "categoryId": 4,
  "relatedSystemId": 4,
  "requestedPriority": "HIGH"
}
```
- **Field Validations**:
  - `summary`: string, trimmed, length 5–100 chars (Required)
  - `description`: string, trimmed, length 10–2000 chars (Required)
  - `categoryId`: integer, must reference active Category (Required)
  - `relatedSystemId`: integer, must reference active RelatedSystem (Required)
  - `requestedPriority`: enum `"LOW" | "MEDIUM" | "HIGH"` (Required)
- **Success (201 Created)**:
```json
{
  "id": 1,
  "ticketNumber": "TKT-2026-000001",
  "summary": "Cannot connect to VPN from home office",
  "description": "Getting error 800 when attempting to connect to corporate VPN gateway since morning.",
  "requestedPriority": "HIGH",
  "status": "NEW",
  "requesterId": 1,
  "categoryId": 4,
  "relatedSystemId": 4,
  "createdAt": "2026-08-29T12:00:00.000Z",
  "updatedAt": "2026-08-29T12:00:00.000Z",
  "requester": {
    "id": 1,
    "name": "Jennifer Anderson",
    "email": "jennifer.anderson@toktickit.local"
  },
  "category": {
    "id": 4,
    "name": "Network"
  },
  "relatedSystem": {
    "id": 4,
    "name": "VPN"
  },
  "attachments": []
}
```
- **Errors**:
  - `400 Bad Request`: Validation failure or missing `X-Dev-Requester-Id`
  - `403 Forbidden`: Inactive requester
  - `409 Conflict`: Duplicate idempotency key with conflicting payload

---

### 3.2 GET `/api/tickets`
Lists tickets belonging to the requester specified in `X-Dev-Requester-Id`.

- **Headers**:
  - `X-Dev-Requester-Id`: `1` (Required)
- **Query Parameters**:
  - `search` (string, optional): Keyword search matching `ticketNumber` or `summary` (case-insensitive substring)
  - `categoryId` (integer, optional): Filter by category ID
  - `requestedPriority` (string, optional): Filter by priority (`LOW`, `MEDIUM`, `HIGH`)
  - `status` (string, optional): Filter by status (`NEW`, etc.)
  - `sortBy` (string, optional, default: `"createdAt"`): Field to sort by (`createdAt`, `ticketNumber`, `requestedPriority`)
  - `sortOrder` (string, optional, default: `"desc"`): Sort direction (`asc`, `desc`)
  - `page` (integer, optional, default: `1`): 1-based page number
  - `pageSize` (integer, optional, default: `8`, permitted: `8`, `20`, `50`): Items per page
- **Success (200 OK)**:
```json
{
  "data": [
    {
      "id": 1,
      "ticketNumber": "TKT-2026-000001",
      "summary": "Cannot connect to VPN from home office",
      "requestedPriority": "HIGH",
      "status": "NEW",
      "createdAt": "2026-08-29T12:00:00.000Z",
      "updatedAt": "2026-08-29T12:00:00.000Z",
      "category": { "id": 4, "name": "Network" },
      "relatedSystem": { "id": 4, "name": "VPN" },
      "activeAttachmentCount": 1
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 8,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

---

### 3.3 GET `/api/tickets/:id`
Retrieves full details of a specific ticket owned by the requester.

- **Headers**:
  - `X-Dev-Requester-Id`: `1` (Required)
- **Success (200 OK)**:
```json
{
  "id": 1,
  "ticketNumber": "TKT-2026-000001",
  "summary": "Cannot connect to VPN from home office",
  "description": "Getting error 800 when attempting to connect to corporate VPN gateway since morning.",
  "requestedPriority": "HIGH",
  "status": "NEW",
  "requesterId": 1,
  "categoryId": 4,
  "relatedSystemId": 4,
  "createdAt": "2026-08-29T12:00:00.000Z",
  "updatedAt": "2026-08-29T12:00:00.000Z",
  "requester": {
    "id": 1,
    "name": "Jennifer Anderson",
    "email": "jennifer.anderson@toktickit.local"
  },
  "category": { "id": 4, "name": "Network" },
  "relatedSystem": { "id": 4, "name": "VPN" },
  "attachments": [
    {
      "id": 1,
      "ticketId": 1,
      "originalFilename": "vpn-error-screenshot.png",
      "fileSize": 1048576,
      "mimeType": "image/png",
      "isRemoved": false,
      "removedAt": null,
      "removalReason": null,
      "createdAt": "2026-08-29T12:05:00.000Z"
    }
  ]
}
```
- **Errors**:
  - `404 Not Found`: Ticket not found OR owned by another requester.

---

## 4. Attachment Endpoints

### 4.1 POST `/api/tickets/:id/attachments`
Uploads a new attachment for an owned ticket.

- **Headers**:
  - `X-Dev-Requester-Id`: `1` (Required)
  - `Content-Type`: `multipart/form-data`
- **Form Data**:
  - `file`: Binary file (allowed: JPG, PNG, WEBP, PDF, <= 5 MB)
- **Constraints**: Max 5 active attachments per ticket.
- **Success (201 Created)**:
```json
{
  "id": 1,
  "ticketId": 1,
  "originalFilename": "vpn-error-screenshot.png",
  "fileSize": 1048576,
  "mimeType": "image/png",
  "isRemoved": false,
  "removedAt": null,
  "removalReason": null,
  "createdAt": "2026-08-29T12:05:00.000Z"
}
```
- **Errors**:
  - `400 Bad Request`: Missing file, unsupported extension, or ticket already has 5 active attachments.
  - `404 Not Found`: Ticket not found or not owned by requester.
  - `413 Payload Too Large`: File exceeds 5 MB.
  - `415 Unsupported Media Type`: MIME type not in allowed list.

---

### 4.2 GET `/api/tickets/:id/attachments`
Lists all attachment metadata (both active and soft-removed) for an owned ticket.

- **Headers**:
  - `X-Dev-Requester-Id`: `1` (Required)
- **Success (200 OK)**:
```json
[
  {
    "id": 1,
    "ticketId": 1,
    "originalFilename": "vpn-error-screenshot.png",
    "fileSize": 1048576,
    "mimeType": "image/png",
    "isRemoved": false,
    "removedAt": null,
    "removalReason": null,
    "createdAt": "2026-08-29T12:05:00.000Z"
  },
  {
    "id": 2,
    "ticketId": 1,
    "originalFilename": "sensitive_data.pdf",
    "fileSize": 2097152,
    "mimeType": "application/pdf",
    "isRemoved": true,
    "removedAt": "2026-08-29T12:10:00.000Z",
    "removalReason": "Uploaded wrong document containing personal data",
    "createdAt": "2026-08-29T12:06:00.000Z"
  }
]
```

---

### 4.3 GET `/api/tickets/:id/attachments/:attachmentId/download`
Downloads the binary content of an active attachment.

- **Headers**:
  - `X-Dev-Requester-Id`: `1` (Required)
- **Success (200 OK)**: Binary stream with `Content-Disposition: attachment; filename="vpn-error-screenshot.png"`, `Content-Type: image/png`
- **Errors**:
  - `404 Not Found`: Ticket/Attachment not found, not owned, or attachment is soft-removed (`isRemoved = true`).

---

### 4.4 DELETE `/api/tickets/:id/attachments/:attachmentId`
Soft-removes an attachment with mandatory reason.

- **Headers**:
  - `X-Dev-Requester-Id`: `1` (Required)
  - `Content-Type`: `application/json`
- **Request Body**:
```json
{
  "reason": "Uploaded wrong document containing personal data"
}
```
- **Validation**: `reason` is required, trimmed, min 5 chars, max 255 chars.
- **Success (200 OK)**:
```json
{
  "id": 2,
  "ticketId": 1,
  "originalFilename": "sensitive_data.pdf",
  "fileSize": 2097152,
  "mimeType": "application/pdf",
  "isRemoved": true,
  "removedAt": "2026-08-29T12:10:00.000Z",
  "removalReason": "Uploaded wrong document containing personal data",
  "createdAt": "2026-08-29T12:06:00.000Z"
}
```
- **Errors**:
  - `400 Bad Request`: Missing or invalid removal reason, or attachment already removed.
  - `404 Not Found`: Ticket or attachment not found or not owned.
