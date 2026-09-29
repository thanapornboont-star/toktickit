# Lab 4 REST API Specification — TokTickIT

## 1. Global API Conventions

- **Base URL**: `/api`
- **Protocol**: HTTP/1.1 with JSON payloads
- **Authentication**: `Authorization: Bearer <session-token>`
- **Content-Type**: `application/json`
- **Timestamps**: ISO 8601 UTC strings (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- **Error Format**:
  ```json
  {
    "error": {
      "code": "BAD_REQUEST | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | INTERNAL_SERVER_ERROR",
      "message": "Human readable error description",
      "details": {}
    }
  }
  ```
- **Concurrency & Stale Update Handling (409 Conflict)**:
  Ticket state modifications must include the client's current `updatedAt` timestamp. If the record in the database has a newer `updatedAt`, the API returns `409 Conflict`:
  ```json
  {
    "error": {
      "code": "CONFLICT",
      "message": "The ticket was updated by another user. Please refresh and try again.",
      "currentUpdatedAt": "2026-09-29T14:00:00.000Z"
    }
  }
  ```

---

## 2. Actions Taken Endpoints

### 2.1 GET `/api/tickets/:id/actions-taken`
Retrieves all Actions Taken logged under the specified ticket.

- **Access**:
  - `REQUESTER`: Permitted only if the ticket is owned by the authenticated Requester (`requesterId == session.userId`). Otherwise returns `404 Not Found`.
  - `IT_STAFF`, `ADMINISTRATOR`: Permitted for all accessible tickets.
- **Path Parameters**:
  - `id` (integer, required): The ID of the ticket.
- **Success (200 OK)**:
  ```json
  {
    "actions": [
      {
        "id": 1,
        "ticketId": 12,
        "actionDateTime": "2026-09-29T10:15:00.000Z",
        "description": "Inspected network switch port and re-terminated patch cable.",
        "result": "Link negotiation restored to 1Gbps full duplex. Verified ping response.",
        "performedBy": {
          "id": 3,
          "name": "Michael Chen",
          "email": "michael.chen@toktickit.local",
          "role": "IT_STAFF"
        },
        "isFollowUpRequired": true,
        "followUpNote": "Monitor link error count after 24 hours.",
        "attachmentNotes": "Refer to switch-diagnostic-screenshot.png",
        "createdAt": "2026-09-29T10:20:00.000Z",
        "updatedAt": "2026-09-29T10:20:00.000Z"
      }
    ],
    "totalCount": 1
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Missing or invalid session token.
  - `404 Not Found`: Ticket does not exist or Requester does not own it.

---

### 2.2 POST `/api/tickets/:id/actions-taken`
Creates a new Action Taken line under the specified ticket.

- **Access**: `IT_STAFF`, `ADMINISTRATOR`. (Requesters receive `403 Forbidden`).
- **Path Parameters**:
  - `id` (integer, required): Ticket ID.
- **Request Body**:
  ```json
  {
    "actionDateTime": "2026-09-29T10:15:00.000Z",
    "description": "Replaced RAM module on user desktop.",
    "result": "Passes memtest86 diagnostics without errors.",
    "isFollowUpRequired": false,
    "followUpNote": null,
    "attachmentNotes": "Diagnostic report saved in ticket attachments."
  }
  ```
- **Validation Rules**:
  - `description`: String, required, 3–2000 chars.
  - `result`: String, required, 3–2000 chars.
  - `isFollowUpRequired`: Boolean, optional (default: `false`).
  - `followUpNote`: String. **Mandatory** (3–1000 chars) if `isFollowUpRequired` is `true`. Optional or ignored if `false`.
  - `attachmentNotes`: String, optional, max 500 chars.
  - `actionDateTime`: ISO 8601 string, optional (defaults to current time). Must not be > 5 minutes in future.
- **Success (201 Created)**:
  ```json
  {
    "action": {
      "id": 2,
      "ticketId": 12,
      "actionDateTime": "2026-09-29T10:15:00.000Z",
      "description": "Replaced RAM module on user desktop.",
      "result": "Passes memtest86 diagnostics without errors.",
      "performedBy": {
        "id": 3,
        "name": "Michael Chen",
        "email": "michael.chen@toktickit.local",
        "role": "IT_STAFF"
      },
      "isFollowUpRequired": false,
      "followUpNote": null,
      "attachmentNotes": "Diagnostic report saved in ticket attachments.",
      "createdAt": "2026-09-29T10:25:00.000Z",
      "updatedAt": "2026-09-29T10:25:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Missing fields or missing `followUpNote` when `isFollowUpRequired = true`.
  - `403 Forbidden`: Authenticated user is a `REQUESTER`.
  - `404 Not Found`: Ticket does not exist.

---

### 2.3 PUT `/api/tickets/:id/actions-taken/:actionId`
Updates an existing Action Taken record.

- **Access**: `IT_STAFF`, `ADMINISTRATOR`.
- **Path Parameters**:
  - `id` (integer, required): Ticket ID.
  - `actionId` (integer, required): Action Taken ID.
- **Request Body**:
  ```json
  {
    "actionDateTime": "2026-09-29T10:15:00.000Z",
    "description": "Replaced RAM module and stress tested.",
    "result": "Tested 100% OK under full load.",
    "isFollowUpRequired": true,
    "followUpNote": "Check with user tomorrow morning.",
    "attachmentNotes": "See log attached."
  }
  ```
- **Success (200 OK)**: Returns the updated action object.
- **Error Responses**:
  - `400 Bad Request`: Validation failure.
  - `403 Forbidden`: Requester role.
  - `404 Not Found`: Ticket or Action Taken does not exist.

---

## 3. Ticket Workflow & Resolution Gate Endpoints

### 3.1 PATCH `/api/tickets/:id/status`
Updates the ticket workflow status adhering to the authorized transition matrix and concurrency controls.

- **Access**: `IT_STAFF`, `ADMINISTRATOR`.
- **Path Parameters**:
  - `id` (integer, required): Ticket ID.
- **Request Body**:
  ```json
  {
    "status": "RESOLVED",
    "clientUpdatedAt": "2026-09-29T09:30:00.000Z"
  }
  ```
- **Status State Machine**:
  - `NEW` -> `OPEN`, `IN_PROGRESS`, `CANCELLED`
  - `OPEN` -> `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`
  - `IN_PROGRESS` -> `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`
  - `WAITING_FOR_REQUESTER` -> `IN_PROGRESS`, `RESOLVED`, `CANCELLED`
  - `RESOLVED` -> `CLOSED`, `REOPENED`
  - `REOPENED` -> `IN_PROGRESS`, `RESOLVED`, `CANCELLED`
  - `CLOSED`, `CANCELLED` -> Terminal states (no transitions allowed)
- **Success (200 OK)**:
  ```json
  {
    "ticket": {
      "id": 12,
      "ticketNumber": "TKT-2026-000012",
      "status": "RESOLVED",
      "updatedAt": "2026-09-29T10:30:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Invalid transition (e.g. `NEW` -> `RESOLVED` or transition from `CLOSED`).
  - `403 Forbidden`: Requesters attempting to call this endpoint.
  - `404 Not Found`: Ticket not found.
  - `409 Conflict`: Stale update (`clientUpdatedAt` differs from database `updatedAt`).

---

### 3.2 PATCH `/api/tickets/:id/indicate-resolved`
Allows a Requester to submit or toggle their advisory opinion that the problem appears resolved.

- **Access**: `REQUESTER` (must own ticket), `IT_STAFF`, `ADMINISTRATOR`.
- **Request Body**:
  ```json
  {
    "indicated": true
  }
  ```
- **Behavior**: Sets `requesterIndicatedResolved = true` without modifying `status`.
- **Success (200 OK)**:
  ```json
  {
    "ticketId": 12,
    "requesterIndicatedResolved": true,
    "status": "IN_PROGRESS"
  }
  ```

---

## 4. Operational Dashboard Endpoints

### 4.1 GET `/api/dashboard/requester`
Retrieves operational summary metrics and recent tickets for the authenticated Requester.

- **Access**: `REQUESTER`.
- **Success (200 OK)**:
  ```json
  {
    "metrics": {
      "totalOpen": 3,
      "inProgress": 2,
      "waitingForRequester": 1,
      "recentlyResolved": 5,
      "closed": 12
    },
    "recentTickets": [
      {
        "id": 12,
        "ticketNumber": "TKT-2026-000012",
        "summary": "Laptop battery drains quickly",
        "status": "IN_PROGRESS",
        "updatedAt": "2026-09-29T10:30:00.000Z"
      }
    ]
  }
  ```
- **Empty State**: When user has no tickets, counters return `0` and `recentTickets` returns `[]`.

---

### 4.2 GET `/api/dashboard/staff`
Retrieves operational queue metrics and urgent ticket summaries for IT Staff.

- **Access**: `IT_STAFF`, `ADMINISTRATOR`.
- **Success (200 OK)**:
  ```json
  {
    "metrics": {
      "new": 14,
      "open": 23,
      "inProgress": 18,
      "waitingForRequester": 7,
      "myAssigned": 16,
      "unassigned": 12,
      "recentlyUpdated": 25,
      "priorityCounts": {
        "high": 8,
        "medium": 32,
        "low": 22
      }
    },
    "recentTickets": [
      {
        "id": 12,
        "ticketNumber": "TKT-2026-000012",
        "summary": "Core router flap in building 3",
        "status": "OPEN",
        "itPriority": "HIGH",
        "owner": {
          "id": 3,
          "name": "Michael Chen"
        },
        "updatedAt": "2026-09-29T11:00:00.000Z"
      }
    ]
  }
  ```

---

### 4.3 GET `/api/dashboard/admin`
Retrieves IT Staff operational metrics plus concise administrative user accounts statistics.

- **Access**: `ADMINISTRATOR`.
- **Success (200 OK)**:
  ```json
  {
    "operational": { /* Same as staff metrics */ },
    "userAccounts": {
      "totalUsers": 15,
      "activeUsers": 13,
      "inactiveUsers": 2,
      "roles": {
        "requesters": 9,
        "itStaff": 5,
        "administrators": 1
      }
    }
  }
  ```

---

## 5. Continuity of Existing APIs (Labs 1–3)

All previously implemented endpoints remain fully operational and tested:
- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/change-password`, `POST /api/auth/logout`
- `GET /api/categories`, `GET /api/related-systems`
- `GET /api/tickets` (with search, category, status, priority, owner filters)
- `POST /api/tickets` (ticket creation with attachment uploads)
- `GET /api/tickets/:id` (full detail retrieval)
- `POST /api/tickets/:id/attachments`, `DELETE /api/tickets/:id/attachments/:attachmentId`
- `GET /api/tickets/:id/comments`, `POST /api/tickets/:id/comments` (Public Comments)
- `GET /api/tickets/:id/notes`, `POST /api/tickets/:id/notes` (Internal Notes, IT Staff/Admin only)
- `GET /api/admin/users`, `POST /api/admin/users`, `PUT /api/admin/users/:id`, `POST /api/admin/users/:id/reset-password`
