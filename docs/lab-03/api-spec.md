# Lab 3 REST API Specification — TokTickIT

## 1. Global API Conventions

- **Base URL**: `/api`
- **Protocol**: HTTP/1.1 over JSON (and `multipart/form-data` for file uploads)
- **Authentication Header**: `Authorization: Bearer <session-token>`
- **Content-Type**: `application/json` (except file upload endpoints)
- **Timestamps**: ISO 8601 UTC strings (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- **Deprecation**: Header `X-Dev-Requester-Id` is strictly deprecated and ignored. All identities are derived solely from the validated Bearer session token.
- **Ownership Policy (404 Not Found)**:
  - When a Requester attempts to query, comment on, or modify an individual ticket, attachment, or resource owned by another user or nonexistent, the API responds with `404 Not Found` to prevent information disclosure:
  ```json
  {
    "error": {
      "code": "NOT_FOUND",
      "message": "Ticket not found"
    }
  }
  ```
- **Authorization Rejection (403 Forbidden)**:
  - When an authenticated user calls an endpoint outside their permitted role (e.g. Requester calling `/api/staff/*` or `/api/admin/*`, or IT Staff calling user creation), the API responds with `403 Forbidden`:
  ```json
  {
    "error": {
      "code": "FORBIDDEN",
      "message": "Access denied: insufficient permissions for role"
    }
  }
  ```
- **Standard Error Response Format**:
  ```json
  {
    "error": {
      "code": "BAD_REQUEST | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | PAYLOAD_TOO_LARGE | UNSUPPORTED_MEDIA_TYPE | INTERNAL_SERVER_ERROR",
      "message": "Human readable error description",
      "details": {}
    }
  }
  ```

---

## 2. Authentication Endpoints

### 2.1 POST `/api/auth/login`
Authenticates a user with email and password, issuing an active session token.

- **Access**: Public (Unauthenticated)
- **Request Body**:
  ```json
  {
    "email": "jennifer.anderson@toktickit.local",
    "password": "Password123!"
  }
  ```
- **Success (200 OK)**:
  ```json
  {
    "token": "toktickit_session_a1b2c3d4e5f6...",
    "user": {
      "id": 1,
      "email": "jennifer.anderson@toktickit.local",
      "name": "Jennifer Anderson",
      "role": "REQUESTER",
      "isActive": true,
      "mustChangePassword": false
    }
  }
  ```
- **Errors**:
  - `400 Bad Request`: Missing email or password.
  - `401 Unauthorized`: Invalid email or password (`{ "error": { "code": "UNAUTHORIZED", "message": "Invalid email or password" } }`).
  - `403 Forbidden`: Deactivated account (`{ "error": { "code": "FORBIDDEN", "message": "Account is deactivated. Please contact an administrator." } }`).

### 2.2 POST `/api/auth/logout`
Revokes the current session token immediately.

- **Access**: Authenticated (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`)
- **Headers**: `Authorization: Bearer <token>`
- **Success (200 OK)**:
  ```json
  {
    "message": "Logged out successfully"
  }
  ```
- **Errors**:
  - `401 Unauthorized`: Missing or invalid session token.

### 2.3 GET `/api/auth/me`
Retrieves the profile and role of the currently authenticated user.

- **Access**: Authenticated (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`)
- **Headers**: `Authorization: Bearer <token>`
- **Success (200 OK)**:
  ```json
  {
    "user": {
      "id": 1,
      "email": "jennifer.anderson@toktickit.local",
      "name": "Jennifer Anderson",
      "role": "REQUESTER",
      "isActive": true,
      "mustChangePassword": false
    }
  }
  ```
- **Errors**:
  - `401 Unauthorized`: Missing or invalid token.

### 2.4 POST `/api/auth/change-password`
Changes the user's password. Required when `mustChangePassword = true`.

- **Access**: Authenticated (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`)
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "currentPassword": "Initial123!",
    "newPassword": "NewSecurePassword123!",
    "confirmPassword": "NewSecurePassword123!"
  }
  ```
- **Success (200 OK)**:
  ```json
  {
    "message": "Password changed successfully",
    "user": {
      "id": 1,
      "email": "new.user@toktickit.local",
      "name": "New User",
      "role": "REQUESTER",
      "isActive": true,
      "mustChangePassword": false
    }
  }
  ```
- **Errors**:
  - `400 Bad Request`: New password does not meet password policy or confirm password does not match.
  - `401 Unauthorized`: Incorrect current password.

---

## 3. Reference Data Endpoints

### 3.1 GET `/api/categories`
Returns active ticket categories.

- **Access**: Authenticated (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`)
- **Success (200 OK)**:
  ```json
  [
    { "id": 1, "name": "Account and Access", "isActive": true },
    { "id": 2, "name": "Hardware", "isActive": true },
    { "id": 3, "name": "Software", "isActive": true },
    { "id": 4, "name": "Network", "isActive": true }
  ]
  ```

### 3.2 GET `/api/related-systems`
Returns active related systems.

- **Access**: Authenticated (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`)
- **Success (200 OK)**:
  ```json
  [
    { "id": 1, "name": "Corporate Laptop", "description": "Laptops and accessories", "isActive": true },
    { "id": 2, "name": "Email", "description": "Corporate mailbox & Outlook", "isActive": true }
  ]
  ```

---

## 4. Requester Ticket Endpoints

### 4.1 POST `/api/tickets`
Creates a ticket owned by the authenticated Requester.

- **Access**: `REQUESTER` only
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "summary": "VPN connection drops every 10 minutes",
    "description": "Whenever I connect to the KMUTT VPN, the connection disconnects after 10 minutes.",
    "categoryId": 4,
    "relatedSystemId": 4,
    "requestedPriority": "HIGH"
  }
  ```
- **Success (201 Created)**:
  ```json
  {
    "ticket": {
      "id": 10,
      "ticketNumber": "TKT-2026-000010",
      "summary": "VPN connection drops every 10 minutes",
      "description": "Whenever I connect to the KMUTT VPN, the connection disconnects after 10 minutes.",
      "requestedPriority": "HIGH",
      "itPriority": "HIGH",
      "status": "NEW",
      "requesterIndicatedResolved": false,
      "requesterId": 1,
      "ownerId": null,
      "categoryId": 4,
      "relatedSystemId": 4,
      "createdAt": "2026-09-12T14:30:00.000Z",
      "updatedAt": "2026-09-12T14:30:00.000Z"
    }
  }
  ```
- **Errors**:
  - `400 Bad Request`: Missing summary or description, invalid category or system ID.
  - `403 Forbidden`: User role is not `REQUESTER`.

### 4.2 GET `/api/tickets`
Returns paginated tickets owned strictly by the authenticated Requester.

- **Access**: `REQUESTER` only
- **Query Parameters**:
  - `search` (string, optional): Matches ticket number or summary.
  - `categoryId` (int, optional).
  - `priority` (enum `LOW|MEDIUM|HIGH`, optional): Filters by `requestedPriority`.
  - `status` (enum, optional).
  - `page` (int, optional, default: 1).
  - `pageSize` (int, optional, default: 8).
  - `sortBy` (enum `createdAt|ticketNumber|requestedPriority`, default: `createdAt`).
  - `sortOrder` (enum `asc|desc`, default: `desc`).
- **Success (200 OK)**:
  ```json
  {
    "tickets": [
      {
        "id": 10,
        "ticketNumber": "TKT-2026-000010",
        "summary": "VPN connection drops every 10 minutes",
        "requestedPriority": "HIGH",
        "status": "NEW",
        "requesterIndicatedResolved": false,
        "category": { "id": 4, "name": "Network" },
        "attachmentCount": 1,
        "createdAt": "2026-09-12T14:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 8,
      "totalTickets": 1,
      "totalPages": 1
    }
  }
  ```

### 4.3 GET `/api/tickets/:id`
Retrieves owned ticket details.

- **Access**: `REQUESTER` only
- **Success (200 OK)**:
  ```json
  {
    "ticket": {
      "id": 10,
      "ticketNumber": "TKT-2026-000010",
      "summary": "VPN connection drops every 10 minutes",
      "description": "Whenever I connect to the KMUTT VPN, the connection disconnects after 10 minutes.",
      "requestedPriority": "HIGH",
      "itPriority": "HIGH",
      "status": "NEW",
      "requesterIndicatedResolved": false,
      "category": { "id": 4, "name": "Network" },
      "relatedSystem": { "id": 4, "name": "VPN" },
      "requester": { "id": 1, "name": "Jennifer Anderson", "email": "jennifer.anderson@toktickit.local" },
      "attachments": [],
      "createdAt": "2026-09-12T14:30:00.000Z",
      "updatedAt": "2026-09-12T14:30:00.000Z"
    }
  }
  ```
- **Errors**:
  - `404 Not Found`: Ticket not found or owned by another user.

### 4.4 POST `/api/tickets/:id/indicate-resolved`
Allows Requester to indicate that the reported problem appears resolved.

- **Access**: `REQUESTER` only (Must own the ticket)
- **Success (200 OK)**:
  ```json
  {
    "message": "Indicated problem appears resolved",
    "ticket": {
      "id": 10,
      "requesterIndicatedResolved": true
    }
  }
  ```
- **Errors**:
  - `404 Not Found`: Ticket not found or owned by another user.

### 4.5 GET `/api/tickets/:id/public-comments`
Retrieves public comments for a ticket.

- **Access**: `REQUESTER` (on owned tickets), `IT_STAFF`, `ADMINISTRATOR`
- **Success (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "content": "Thank you for reporting. We are investigating the VPN gateway logs.",
      "author": {
        "id": 5,
        "name": "Staff Alex",
        "role": "IT_STAFF"
      },
      "createdAt": "2026-09-12T14:35:00.000Z"
    }
  ]
  ```
- **Errors**:
  - `404 Not Found`: Ticket not found or unowned by requesting Requester.

### 4.6 POST `/api/tickets/:id/public-comments`
Posts a new public comment.

- **Access**: `REQUESTER` (on owned tickets), `IT_STAFF`, `ADMINISTRATOR`
- **Request Body**:
  ```json
  {
    "content": "I restarted my router and the issue still persists."
  }
  ```
- **Success (201 Created)**:
  ```json
  {
    "comment": {
      "id": 2,
      "ticketId": 10,
      "content": "I restarted my router and the issue still persists.",
      "author": {
        "id": 1,
        "name": "Jennifer Anderson",
        "role": "REQUESTER"
      },
      "createdAt": "2026-09-12T14:38:00.000Z"
    }
  }
  ```
- **Errors**:
  - `400 Bad Request`: Empty or whitespace-only content, or exceeds 2,000 chars.
  - `404 Not Found`: Ticket not found or unowned by requesting Requester.

---

## 5. IT Staff Ticket Queue & Detail Endpoints

### 5.1 GET `/api/staff/tickets`
Retrieves the shared operational queue with search, filtering, sorting, and pagination.

- **Access**: `IT_STAFF`, `ADMINISTRATOR`
- **Query Parameters**:
  - `search` (string, optional): Matches ticket number or summary.
  - `categoryId` (int, optional).
  - `status` (enum, optional).
  - `requestedPriority` (enum, optional).
  - `itPriority` (enum, optional).
  - `ownerId` (string, optional): Number (e.g. `5`) or `"unassigned"`.
  - `sortBy` (enum `createdAt|updatedAt|ticketNumber|itPriority`, default: `createdAt`).
  - `sortOrder` (enum `asc|desc`, default: `desc`).
  - `page` (int, optional, default: 1).
  - `pageSize` (int, optional, default: 10, max: 50).
- **Success (200 OK)**:
  ```json
  {
    "tickets": [
      {
        "id": 10,
        "ticketNumber": "TKT-2026-000010",
        "summary": "VPN connection drops every 10 minutes",
        "category": { "id": 4, "name": "Network" },
        "requestedPriority": "HIGH",
        "itPriority": "HIGH",
        "status": "OPEN",
        "requesterIndicatedResolved": false,
        "requester": { "id": 1, "name": "Jennifer Anderson" },
        "owner": { "id": 5, "name": "Staff Alex" },
        "createdAt": "2026-09-12T14:30:00.000Z",
        "updatedAt": "2026-09-12T14:35:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "totalTickets": 25,
      "totalPages": 3
    }
  }
  ```
- **Errors**:
  - `403 Forbidden`: Requester accounts.

### 5.2 GET `/api/staff/tickets/:id`
Retrieves full operational ticket detail for staff.

- **Access**: `IT_STAFF`, `ADMINISTRATOR`
- **Success (200 OK)**:
  ```json
  {
    "ticket": {
      "id": 10,
      "ticketNumber": "TKT-2026-000010",
      "summary": "VPN connection drops every 10 minutes",
      "description": "Whenever I connect to the KMUTT VPN, the connection disconnects after 10 minutes.",
      "requestedPriority": "HIGH",
      "itPriority": "HIGH",
      "status": "OPEN",
      "requesterIndicatedResolved": false,
      "category": { "id": 4, "name": "Network" },
      "relatedSystem": { "id": 4, "name": "VPN" },
      "requester": { "id": 1, "name": "Jennifer Anderson", "email": "jennifer.anderson@toktickit.local" },
      "owner": { "id": 5, "name": "Staff Alex", "email": "staff.alex@toktickit.local" },
      "attachments": [],
      "createdAt": "2026-09-12T14:30:00.000Z",
      "updatedAt": "2026-09-12T14:35:00.000Z"
    }
  }
  ```
- **Errors**:
  - `404 Not Found`: Ticket does not exist.
  - `403 Forbidden`: Requester accounts.

### 5.3 PATCH `/api/staff/tickets/:id/owner`
Assigns or reassigns primary ticket owner, or unassigns owner.

- **Access**: `IT_STAFF`, `ADMINISTRATOR`
- **Request Body**:
  ```json
  {
    "ownerId": 5
  }
  ```
  *(Pass `null` to unassign, or an active IT Staff user's ID).*
- **Success (200 OK)**:
  ```json
  {
    "message": "Ticket owner updated",
    "ticket": {
      "id": 10,
      "ownerId": 5,
      "owner": { "id": 5, "name": "Staff Alex" }
    }
  }
  ```
- **Errors**:
  - `400 Bad Request`: User does not exist, is inactive, or does not have `IT_STAFF` or `ADMINISTRATOR` role.

### 5.4 PATCH `/api/staff/tickets/:id/priority`
Modifies the ticket's IT Priority.

- **Access**: `IT_STAFF`, `ADMINISTRATOR`
- **Request Body**:
  ```json
  {
    "itPriority": "MEDIUM"
  }
  ```
- **Success (200 OK)**:
  ```json
  {
    "message": "IT Priority updated",
    "ticket": {
      "id": 10,
      "itPriority": "MEDIUM"
    }
  }
  ```
- **Errors**:
  - `400 Bad Request`: Invalid priority value.

### 5.5 PATCH `/api/staff/tickets/:id/status`
Executes an authorized status transition according to BR-15.

- **Access**: `IT_STAFF`, `ADMINISTRATOR`
- **Request Body**:
  ```json
  {
    "status": "IN_PROGRESS"
  }
  ```
- **Success (200 OK)**:
  ```json
  {
    "message": "Status updated successfully",
    "ticket": {
      "id": 10,
      "status": "IN_PROGRESS"
    }
  }
  ```
- **Errors**:
  - `400 Bad Request`: Transition not permitted from current status (e.g. `NEW` -> `CLOSED`).

### 5.6 GET `/api/staff/tickets/:id/internal-notes`
Retrieves private internal notes for a ticket.

- **Access**: `IT_STAFF`, `ADMINISTRATOR` only
- **Success (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "ticketId": 10,
      "content": "Checked Cisco VPN concentrator; high packet loss on subnet 10.2.x.x.",
      "author": {
        "id": 5,
        "name": "Staff Alex",
        "role": "IT_STAFF"
      },
      "createdAt": "2026-09-12T14:36:00.000Z"
    }
  ]
  ```
- **Errors**:
  - `403 Forbidden`: Requester accounts.

### 5.7 POST `/api/staff/tickets/:id/internal-notes`
Creates a private internal note on a ticket.

- **Access**: `IT_STAFF`, `ADMINISTRATOR` only
- **Request Body**:
  ```json
  {
    "content": "Checked Cisco VPN concentrator; high packet loss on subnet 10.2.x.x."
  }
  ```
- **Success (201 Created)**:
  ```json
  {
    "internalNote": {
      "id": 1,
      "ticketId": 10,
      "content": "Checked Cisco VPN concentrator; high packet loss on subnet 10.2.x.x.",
      "author": {
        "id": 5,
        "name": "Staff Alex",
        "role": "IT_STAFF"
      },
      "createdAt": "2026-09-12T14:36:00.000Z"
    }
  }
  ```
- **Errors**:
  - `400 Bad Request`: Blank content or exceeds 2,000 chars.
  - `403 Forbidden`: Requester accounts.

### 5.8 GET `/api/staff/members`
Retrieves list of active staff members eligible for ticket ownership assignment.

- **Access**: `IT_STAFF`, `ADMINISTRATOR`
- **Success (200 OK)**:
  ```json
  [
    { "id": 5, "name": "Staff Alex", "email": "staff.alex@toktickit.local", "role": "IT_STAFF" },
    { "id": 6, "name": "Staff Emily", "email": "staff.emily@toktickit.local", "role": "IT_STAFF" },
    { "id": 7, "name": "Staff Marcus", "email": "staff.marcus@toktickit.local", "role": "IT_STAFF" }
  ]
  ```

---

## 6. Administrator User Management Endpoints

### 6.1 GET `/api/admin/users`
Retrieves all users with search and role filtering.

- **Access**: `ADMINISTRATOR` only
- **Query Parameters**:
  - `search` (string, optional): Matches user name or email.
  - `role` (enum `REQUESTER|IT_STAFF|ADMINISTRATOR`, optional).
- **Success (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "name": "Jennifer Anderson",
      "email": "jennifer.anderson@toktickit.local",
      "role": "REQUESTER",
      "isActive": true,
      "mustChangePassword": false,
      "createdAt": "2026-09-12T10:00:00.000Z"
    },
    {
      "id": 5,
      "name": "Staff Alex",
      "email": "staff.alex@toktickit.local",
      "role": "IT_STAFF",
      "isActive": true,
      "mustChangePassword": false,
      "createdAt": "2026-09-12T10:00:00.000Z"
    }
  ]
  ```
- **Errors**:
  - `403 Forbidden`: Non-Administrator users.

### 6.2 POST `/api/admin/users`
Creates a new user account with one role and an initial password.

- **Access**: `ADMINISTRATOR` only
- **Request Body**:
  ```json
  {
    "name": "Bob Vance",
    "email": "bob.vance@toktickit.local",
    "role": "REQUESTER",
    "isActive": true,
    "initialPassword": "InitialPassword123!"
  }
  ```
- **Success (201 Created)**:
  ```json
  {
    "user": {
      "id": 12,
      "name": "Bob Vance",
      "email": "bob.vance@toktickit.local",
      "role": "REQUESTER",
      "isActive": true,
      "mustChangePassword": true,
      "createdAt": "2026-09-12T14:40:00.000Z"
    }
  }
  ```
- **Errors**:
  - `400 Bad Request`: Missing fields or password fails complexity rules.
  - `409 Conflict`: Email already exists.
  - `403 Forbidden`: Non-Administrator users.

### 6.3 PATCH `/api/admin/users/:id`
Updates user details, role, or active status.

- **Access**: `ADMINISTRATOR` only
- **Request Body**:
  ```json
  {
    "name": "Bob Vance Jr.",
    "email": "bob.vance@toktickit.local",
    "role": "IT_STAFF",
    "isActive": true
  }
  ```
- **Success (200 OK)**:
  ```json
  {
    "user": {
      "id": 12,
      "name": "Bob Vance Jr.",
      "email": "bob.vance@toktickit.local",
      "role": "IT_STAFF",
      "isActive": true,
      "mustChangePassword": true
    }
  }
  ```
- **Errors**:
  - `400 Bad Request`: Attempting to deactivate own account (BR-21) or deactivating/reassigning the last active Administrator (BR-22).
  - `409 Conflict`: Email address in use by another user.
  - `404 Not Found`: User does not exist.
  - `403 Forbidden`: Non-Administrator users.

### 6.4 POST `/api/admin/users/:id/reset-password`
Assigns a new initial password for a user.

- **Access**: `ADMINISTRATOR` only
- **Request Body**:
  ```json
  {
    "newInitialPassword": "TemporaryPass123!"
  }
  ```
- **Success (200 OK)**:
  ```json
  {
    "message": "Initial password set. User will be required to change password on next login.",
    "user": {
      "id": 12,
      "mustChangePassword": true
    }
  }
  ```
- **Errors**:
  - `400 Bad Request`: Password violates policy.
  - `404 Not Found`: User does not exist.
  - `403 Forbidden`: Non-Administrator users.
