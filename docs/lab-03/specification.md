# Lab 3 Sprint Engineering Specification — TokTickIT

## 1. Sprint Goal

Deliver real user identity, role-based access control (RBAC), operational IT Staff ticket management, and minimalist Administrator user management for TokTickIT using the Zen Green design language. This sprint deprecates the temporary Development Requester testing selector, introduces secure authentication and mandatory first-login password change, preserves full Requester ticketing continuity, enables IT Staff to claim, prioritize, transition, and communicate on tickets via Public Comments and role-restricted Internal Notes, and provides Administrators with essential user lifecycle controls.

---

## 2. Stakeholder Request Interpretation

The stakeholder requires replacing the temporary Development Requester selector with production-grade user authentication and role-based authorization. The system must support three distinct personas: Requesters, IT Staff, and Administrators. Requesters must continue creating and tracking their own tickets and attachments using their authenticated identity, with the added capability to participate in Public Comments and indicate when an issue appears resolved (without having the authority to formally close tickets). IT Staff require a shared work queue with search, filtering, sorting, and pagination, along with ticket detail capabilities to claim ownership, reassign tickets, set IT Priority, execute permitted workflow status changes, post Public Comments, and record private Internal Notes. Administrators require a minimalist User Management screen to list, search, create, edit, activate/deactivate accounts, and assign new initial passwords. All access boundaries must be enforced on the backend, and the user interface must consistently maintain the Zen Green theme across all viewports.

---

## 3. Scope

### 3.1 Included Scope
- **Authentication & Account Lifecycle**:
  - Secure login with email address and password.
  - Safe error handling for invalid credentials and deactivated accounts.
  - Mandatory first-login password change for accounts created with an initial password.
  - Authenticated session management and explicit logout invalidation.
  - Current authenticated user retrieval (`/api/auth/me`).
- **Role-Based Authorization (RBAC)**:
  - Three distinct roles: `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR` (one role per user).
  - Server-side middleware enforcing endpoint role permissions and data ownership boundaries.
  - Role-tailored application shell navigation hiding unauthorized destinations.
- **Requester Ticketing Continuity & Extensions**:
  - Complete removal of the temporary Development Requester selector and header.
  - Existing Lab 2 ticket creation, "My Tickets" list, Ticket Detail, and Attachment management (upload, download, soft-removal) bound strictly to the authenticated user.
  - Threaded Public Comments visible to Requesters, IT Staff, and Administrators.
  - "Problem Appears Resolved" indication actionable by the ticket owner.
- **IT Staff Operational Workflows**:
  - Shared IT Staff Ticket Queue with multi-field search, filtering (Category, Requested Priority, IT Priority, Status, Owner), sorting, and pagination.
  - Detailed Ticket Operational View: claim ticket ownership, assign/reassign to active IT Staff, adjust IT Priority (`LOW`, `MEDIUM`, `HIGH`).
  - Strict status workflow state machine (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`).
  - Threaded Internal Notes visible exclusively to IT Staff and Administrators.
  - Visually distinct styling distinguishing Public Comments from Internal Notes.
- **Administrator User Management**:
  - Minimalist user directory with search by name/email and role filtering.
  - User creation with name, email, one role, active status, and initial password.
  - User editing (name, email, role, active status).
  - Setting new initial passwords triggering forced password change on subsequent login.
  - Safety constraints: self-deactivation prevention, last active administrator protection, email uniqueness.
- **Data Model Migration & Seed**:
  - Evolution of PostgreSQL schema via Prisma: `User`, `Role`, `Ticket` extensions (`ownerId`, `itPriority`, `requesterIndicatedResolved`), `PublicComment`, `InternalNote`.
  - Seamless data migration preserving existing Lab 2 Tickets, Attachments, Categories, and Systems.
  - Idempotent seed populating minimum 4 active Requesters, 1 inactive Requester, 3 active IT Staff, 1 inactive IT Staff, 1 active Administrator, distributed tickets, comments, and notes.

### 3.2 Excluded Scope (Explicitly Prohibited in Lab 3)
- Self-registration / public sign-up.
- Email delivery services, invitation emails, or password reset via email links.
- Multi-factor authentication (MFA), OAuth/SSO, or social logins.
- Assigning multiple roles to a single user account.
- Permanent user deletion or bulk user operations (import/export).
- Organizational departments, divisions, or user profile pictures.
- IT Staff "Actions Taken" checklist (deferred to Lab 4).
- Formal SLA calculations, automated escalation rules, and notification services.
- Advanced dashboards or KPI analytics beyond basic queue counts.
- Production cloud deployment infrastructure changes.

---

## 4. Functional Requirements (FR)

- **FR-01**: The system shall authenticate users using email address and password, returning an authenticated session token upon verification.
- **FR-02**: The system shall reject authentication attempts from deactivated accounts with a clear message and reject invalid credentials with a generic safe message.
- **FR-03**: The system shall require users flagged with `mustChangePassword = true` to set a new valid password before gaining access to functional application screens or APIs.
- **FR-04**: The system shall provide an endpoint (`GET /api/auth/me`) returning the current user's profile, role, and password change requirement state.
- **FR-05**: The system shall allow users to log out, immediately revoking their active authentication token and redirecting to the login screen.
- **FR-06**: The system shall display an authenticated application shell presenting the user's name, role badge, role-appropriate navigation links, and a logout button.
- **FR-07**: The system shall bind all Requester ticket creation, listing, detail, and attachment operations to the authenticated user ID without trusting any client-supplied requester ID.
- **FR-08**: The system shall allow Requesters, IT Staff, and Administrators to view and post append-only Public Comments on tickets.
- **FR-09**: The system shall allow ticket Requesters to toggle or submit an indication that their reported problem appears resolved.
- **FR-10**: The system shall provide IT Staff with a Ticket Queue supporting keyword search (Ticket Number, Summary), filters (Category, Status, IT Priority, Owner), sorting, and pagination.
- **FR-11**: The system shall allow IT Staff to view any ticket's full operational detail, including Requester info, attachments, and resolution indication.
- **FR-12**: The system shall allow IT Staff to claim ticket ownership or reassign ticket ownership to any active IT Staff user.
- **FR-13**: The system shall allow IT Staff to modify the ticket's IT Priority independently of the immutable Requested Priority.
- **FR-14**: The system shall allow IT Staff to execute permitted ticket status transitions according to the authorized status matrix.
- **FR-15**: The system shall allow IT Staff and Administrators to create and view append-only Internal Notes on tickets while strictly blocking Requesters from accessing them.
- **FR-16**: The system shall allow Administrators to list users, search users by name or email, and filter users by role.
- **FR-17**: The system shall allow Administrators to create new user accounts with one permitted role, an active status flag, and a temporary initial password.
- **FR-18**: The system shall allow Administrators to edit user names, email addresses, roles, and active statuses, while preventing self-deactivation and deactivation of the last active Administrator.
- **FR-19**: The system shall allow Administrators to assign a new initial password to any user, automatically setting `mustChangePassword = true` for that account.

---

## 5. Business Rules (BR)

### Authentication & Account Security
- **BR-01 (Active Account Prerequisite)**: Only users with `isActive = true` may authenticate. Inactive users attempting login receive HTTP 403 Forbidden with a safe explanation (`Account is deactivated. Please contact an administrator.`).
- **BR-02 (Safe Authentication Errors)**: Invalid email or password combinations must return HTTP 401 Unauthorized with a generic message (`Invalid email or password`) without disclosing whether the email exists in the database.
- **BR-03 (Mandatory First-Login Password Change)**: If `mustChangePassword = true`, the user cannot access any protected resource other than `/api/auth/me`, `/api/auth/change-password`, and `/api/auth/logout`. Direct URL navigation to functional screens is intercepted and routed to the password change screen.
- **BR-04 (Password Policy)**: Passwords must contain a minimum of 8 characters, at least one uppercase letter, at least one lowercase letter, and at least one number or special character.
- **BR-05 (Password Hashing)**: Passwords must be hashed using `bcrypt` (minimum 10 salt rounds). Plaintext passwords must never be stored in the database or written to logs.
- **BR-06 (Token Revocation on Logout)**: Calling `/api/auth/logout` invalidates the active bearer session token on the server. Subsequent requests using the revoked token must return HTTP 401 Unauthorized.

### Role Authorization & Boundaries
- **BR-07 (One Role Assignment)**: Every user account has exactly one assigned role: `REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`. Multiple roles per user are prohibited.
- **BR-08 (Server-Side Authorization Authority)**: All authorization checks must be performed by backend middleware. Hiding or disabling frontend elements is an informational UX aid and not a security control. Unauthorized requests return HTTP 403 Forbidden.
- **BR-09 (Requester Ownership & 404 Isolation)**: Requesters can only access tickets and attachments they own. Any attempt by a Requester to retrieve, comment on, or manipulate a ticket belonging to another user returns HTTP 404 Not Found to prevent leaking the existence of other records.
- **BR-10 (Authenticated Identity Authority)**: The authenticated session token is the sole source of truth for the user's identity. Client-supplied `requesterId` headers or body properties are strictly ignored and rejected.

### Ticket Lifecycle, Ownership & Priorities
- **BR-11 (Initial Ticket State)**: New tickets created by Requesters start with status `NEW`, `requesterIndicatedResolved = false`, and `ownerId = null` (unassigned).
- **BR-12 (Ticket Ownership Constraints)**: A ticket may have zero or one primary Ticket Owner (`ownerId`). The owner must be an active user with role `IT_STAFF` or `ADMINISTRATOR`. Requesters cannot own IT operational handling.
- **BR-13 (Requested Priority vs IT Priority)**: `requestedPriority` is set by the Requester upon creation and is immutable thereafter. `itPriority` is automatically initialized with the `requestedPriority` value upon creation and can subsequently be updated exclusively by IT Staff or Administrators.
- **BR-14 (Supported Ticket Statuses)**: The permitted ticket statuses are:
  1. `NEW`
  2. `OPEN`
  3. `IN_PROGRESS`
  4. `WAITING_FOR_REQUESTER`
  5. `RESOLVED`
  6. `CLOSED`
  7. `REOPENED`
  8. `CANCELLED`
- **BR-15 (Permitted Status Transition Matrix)**:
  | Current Status | Permitted Next Statuses | Permitted Actors |
  |---|---|---|
  | `NEW` | `OPEN`, `IN_PROGRESS`, `CANCELLED` | IT Staff, Administrator |
  | `OPEN` | `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED` | IT Staff, Administrator |
  | `IN_PROGRESS` | `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED` | IT Staff, Administrator |
  | `WAITING_FOR_REQUESTER` | `IN_PROGRESS`, `RESOLVED`, `CANCELLED` | IT Staff, Administrator |
  | `RESOLVED` | `CLOSED`, `REOPENED` | IT Staff, Administrator |
  | `REOPENED` | `IN_PROGRESS`, `RESOLVED`, `CANCELLED` | IT Staff, Administrator |
  | `CLOSED` | *Terminal state (no transitions)* | N/A |
  | `CANCELLED` | *Terminal state (no transitions)* | N/A |
- **BR-16 (Requester Resolution Constraint)**: Requesters cannot formally set a ticket to `RESOLVED` or `CLOSED`. Requesters may only toggle or set `requesterIndicatedResolved = true` (providing feedback to IT Staff).

### Communication & Notes
- **BR-17 (Public Comments Access)**: Public Comments are visible to the ticket's Requester, IT Staff, and Administrators. Comments are append-only; editing and deletion are prohibited.
- **BR-18 (Internal Notes Confidentiality)**: Internal Notes are strictly confidential to IT Staff and Administrators. Any attempt by a Requester to retrieve or create an Internal Note returns HTTP 403 Forbidden.
- **BR-19 (Comment & Note Integrity)**: Comments and Internal Notes must contain non-empty trimmed text (1 to 2,000 characters). Author ID and creation timestamps are generated exclusively by the server.

### Administrator User Management
- **BR-20 (Email Uniqueness & Normalization)**: User email addresses must be unique across the system and normalized to lowercase. Duplicate email registration returns HTTP 409 Conflict.
- **BR-21 (Self-Deactivation Protection)**: An Administrator cannot deactivate their own active account. Attempted self-deactivation returns HTTP 400 Bad Request with message `Administrators cannot deactivate their own account`.
- **BR-22 (Last Active Administrator Protection)**: The system must maintain at least one active Administrator account. Any update that deactivates or changes the role of the sole remaining active Administrator returns HTTP 400 Bad Request with message `Cannot deactivate or reassign the last active Administrator`.
- **BR-23 (Deactivation Instead of Deletion)**: User accounts are never deleted from the database. Setting `isActive = false` revokes login capabilities while preserving referential integrity and historical ticket authorship.
- **BR-24 (Admin Initial Password Assignment)**: When an Administrator issues a new initial password for a user, the user's `mustChangePassword` flag is set to `true`, requiring them to set a new password on their subsequent login.

---

## 6. Role & Authorization Matrix

| Capability / Resource | Requester | IT Staff | Administrator | Unauthenticated |
|---|:---:|:---:|:---:|:---:|
| `POST /api/auth/login` | Allowed | Allowed | Allowed | Allowed |
| `POST /api/auth/logout` | Allowed | Allowed | Allowed | Denied (401) |
| `GET /api/auth/me` | Allowed | Allowed | Allowed | Denied (401) |
| `POST /api/auth/change-password` | Allowed | Allowed | Allowed | Denied (401) |
| `GET /api/categories` | Allowed | Allowed | Allowed | Denied (401) |
| `GET /api/related-systems` | Allowed | Allowed | Allowed | Denied (401) |
| `POST /api/tickets` (Create Ticket) | Allowed | Denied (403) | Denied (403) | Denied (401) |
| `GET /api/tickets` (My Tickets) | Own Only | Denied (403) | Denied (403) | Denied (401) |
| `GET /api/tickets/:id` (Requester Detail) | Own Only (404 otherwise) | Denied (403) | Denied (403) | Denied (401) |
| `POST /api/tickets/:id/attachments` | Own Only (404 otherwise) | Denied (403) | Denied (403) | Denied (401) |
| `GET /api/tickets/:id/attachments` | Own Only (404 otherwise) | Denied (403) | Denied (403) | Denied (401) |
| `GET /api/tickets/:id/attachments/:aid/download`| Own Only (404 otherwise) | Allowed (Staff Detail) | Allowed | Denied (401) |
| `DELETE /api/tickets/:id/attachments/:aid` | Own Only (404 otherwise) | Denied (403) | Denied (403) | Denied (401) |
| `POST /api/tickets/:id/indicate-resolved` | Own Only (404 otherwise) | Denied (403) | Denied (403) | Denied (401) |
| `GET /api/tickets/:id/public-comments` | Own Only (404 otherwise) | Allowed | Allowed | Denied (401) |
| `POST /api/tickets/:id/public-comments` | Own Only (404 otherwise) | Allowed | Allowed | Denied (401) |
| `GET /api/staff/tickets` (Staff Queue) | Denied (403) | Allowed | Allowed | Denied (401) |
| `GET /api/staff/tickets/:id` (Staff Detail) | Denied (403) | Allowed | Allowed | Denied (401) |
| `PATCH /api/staff/tickets/:id/owner` | Denied (403) | Allowed | Allowed | Denied (401) |
| `PATCH /api/staff/tickets/:id/priority` | Denied (403) | Allowed | Allowed | Denied (401) |
| `PATCH /api/staff/tickets/:id/status` | Denied (403) | Allowed | Allowed | Denied (401) |
| `GET /api/staff/tickets/:id/internal-notes` | Denied (403) | Allowed | Allowed | Denied (401) |
| `POST /api/staff/tickets/:id/internal-notes` | Denied (403) | Allowed | Allowed | Denied (401) |
| `GET /api/admin/users` | Denied (403) | Denied (403) | Allowed | Denied (401) |
| `POST /api/admin/users` | Denied (403) | Denied (403) | Allowed | Denied (401) |
| `PATCH /api/admin/users/:id` | Denied (403) | Denied (403) | Allowed | Denied (401) |
| `POST /api/admin/users/:id/reset-password` | Denied (403) | Denied (403) | Allowed | Denied (401) |

---

## 7. Data Changes & Migration

### 7.1 Prisma Models (`server/prisma/schema.prisma`)
```prisma
enum Role {
  REQUESTER
  IT_STAFF
  ADMINISTRATOR
}

enum RequestedPriority {
  LOW
  MEDIUM
  HIGH
}

enum ITPriority {
  LOW
  MEDIUM
  HIGH
}

enum TicketStatus {
  NEW
  OPEN
  IN_PROGRESS
  WAITING_FOR_REQUESTER
  RESOLVED
  CLOSED
  REOPENED
  CANCELLED
}

model User {
  id                 Int              @id @default(autoincrement())
  email              String           @unique
  name               String
  passwordHash       String
  role               Role             @default(REQUESTER)
  isActive           Boolean          @default(true)
  mustChangePassword Boolean          @default(false)
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  submittedTickets   Ticket[]         @relation("RequesterTickets")
  assignedTickets    Ticket[]         @relation("AssignedTickets")
  publicComments     PublicComment[]
  internalNotes      InternalNote[]
  sessions           Session[]

  @@index([email])
  @@index([role])
  @@index([isActive])
}

model Session {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    Int
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([token])
  @@index([userId])
}

model Ticket {
  id                         Int               @id @default(autoincrement())
  ticketNumber               String            @unique
  summary                    String
  description                String
  requestedPriority          RequestedPriority @default(MEDIUM)
  itPriority                 ITPriority        @default(MEDIUM)
  status                     TicketStatus      @default(NEW)
  requesterIndicatedResolved Boolean           @default(false)

  requesterId                Int
  requester                  User              @relation("RequesterTickets", fields: [requesterId], references: [id])

  ownerId                    Int?
  owner                      User?             @relation("AssignedTickets", fields: [ownerId], references: [id])

  categoryId                 Int
  category                   Category          @relation(fields: [categoryId], references: [id])

  relatedSystemId            Int
  relatedSystem              RelatedSystem     @relation(fields: [relatedSystemId], references: [id])

  attachments                Attachment[]
  publicComments             PublicComment[]
  internalNotes              InternalNote[]

  createdAt                  DateTime          @default(now())
  updatedAt                  DateTime          @updatedAt

  @@index([requesterId])
  @@index([ownerId])
  @@index([categoryId])
  @@index([status])
  @@index([itPriority])
  @@index([createdAt])
}

model PublicComment {
  id        Int      @id @default(autoincrement())
  ticketId  Int
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
  content   String
  createdAt DateTime @default(now())

  @@index([ticketId])
  @@index([authorId])
}

model InternalNote {
  id        Int      @id @default(autoincrement())
  ticketId  Int
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
  content   String
  createdAt DateTime @default(now())

  @@index([ticketId])
  @@index([authorId])
}
```

### 7.2 Migration Strategy
- Convert existing `DevRequester` records directly into `User` records with `role = REQUESTER`, `mustChangePassword = false`, and a known development password hash.
- Re-link existing `Ticket.requesterId` foreign keys to the new `User` model.
- Retain all existing Categories, Related Systems, Tickets, and Attachments without data loss.

### 7.3 Seed Data Requirements
- **4 Active Requesters**:
  - `jennifer.anderson@toktickit.local` (Password: `Password123!`)
  - `michael.brown@toktickit.local` (Password: `Password123!`)
  - `sarah.johnson@toktickit.local` (Password: `Password123!`)
  - `david.lee@toktickit.local` (Password: `Password123!`)
- **1 Inactive Requester**:
  - `kevin.patel@toktickit.local` (Inactive, `Password123!`)
- **3 Active IT Staff**:
  - `staff.alex@toktickit.local` (Password: `StaffPass123!`)
  - `staff.emily@toktickit.local` (Password: `StaffPass123!`)
  - `staff.marcus@toktickit.local` (Password: `StaffPass123!`)
- **1 Inactive IT Staff**:
  - `staff.robert@toktickit.local` (Inactive, `StaffPass123!`)
- **1 Active Administrator**:
  - `admin.boss@toktickit.local` (Password: `AdminPass123!`)
- **1 User with Mandatory Password Change**:
  - `new.user@toktickit.local` (Role: `REQUESTER`, `mustChangePassword: true`, Password: `Initial123!`)

---

## 8. UI Specification Summary

- **Design Tokens**: Standard Zen Green `#006B3C` (primary), `#0B7A46` (secondary), `#EAF6EF` (pale), `#F5F7F6` (background), `#1A2E26` (text), `#D1DCD6` (border).
- **Application Shell**: Displays user name, role badge, navigation according to role, and a prominent Logout button.
- **Login Screen**: Minimalist card with email, password, validation indicators, and accessible error alerts.
- **Mandatory Change Password Screen**: Blocked navigation until valid current, new, and confirmed passwords are submitted.
- **Requester Screens**:
  - My Tickets & Create Ticket (reused from Lab 2 without Requester Selector).
  - Ticket Detail: displays Public Comments thread and "Problem Appears Resolved" toggle button.
- **IT Staff Screens**:
  - Staff Ticket Queue: Filter bar (Search, Category, Priority, Status, Ownership), responsive table (desktop) / cards (mobile), status badges, owner pill.
  - Staff Ticket Detail: Operational management pane (Claim/Assign owner, set IT Priority, transition status), tabbed/divided Public Comments and visually distinct yellow-tinted Internal Notes.
- **Administrator Screen**:
  - User Management table listing Name, Email, Role, Status, and Edit action. Create User modal and Edit User modal with self-deactivation protection.

---

## 9. Acceptance Criteria (AC)

- **AC-01**: Given an active user with valid credentials, when submitting the login form, the backend establishes an authenticated session, returning the user identity and role.
- **AC-02**: Given invalid credentials, when attempting login, the system rejects the attempt with HTTP 401 and displays `Invalid email or password`.
- **AC-03**: Given a deactivated account (`isActive = false`), when attempting login, the system rejects the attempt with HTTP 403 and informs the user their account is deactivated.
- **AC-04**: Given a user with `mustChangePassword = true`, when authenticating, normal application routes are blocked, redirecting them to the Change Password screen until a valid new password is saved.
- **AC-05**: Given an authenticated user, when clicking Logout, the session is revoked on the backend, clearing client session storage and redirecting to `/login`.
- **AC-06**: Given an authenticated Requester, when calling ticket creation or retrieval APIs, the backend strictly applies the authenticated user's ID and rejects client-supplied requester IDs.
- **AC-07**: Given a Requester attempting to access a ticket owned by another user, the API responds with HTTP 404 Not Found.
- **AC-08**: Given an authenticated Requester or IT Staff, when submitting a valid Public Comment, the comment is appended to the ticket with server-assigned author and timestamp.
- **AC-09**: Given an authenticated Requester, when submitting an indication that the problem appears resolved, the ticket's `requesterIndicatedResolved` flag is updated to true without closing the ticket.
- **AC-10**: Given an authenticated Requester, when attempting to retrieve or create an Internal Note, the API rejects the request with HTTP 403 Forbidden without exposing note content.
- **AC-11**: Given an authenticated IT Staff member, when querying the Ticket Queue, tickets matching the search keyword, category, status, priority, and owner filters are returned with correct pagination metadata.
- **AC-12**: Given an authenticated IT Staff member, when opening a ticket detail, the operational controls for owner assignment, IT Priority, status transitions, and Internal Notes are available.
- **AC-13**: Given an unassigned ticket, when an IT Staff member clicks "Claim", the ticket's `ownerId` is set to the current IT Staff user.
- **AC-14**: Given a ticket in `OPEN` status, when IT Staff selects `IN_PROGRESS`, the transition is saved and reflected in the status badge.
- **AC-15**: Given a ticket in `NEW` status, when an illegal transition to `CLOSED` is requested, the backend rejects the update with HTTP 400 Bad Request.
- **AC-16**: Given an authenticated IT Staff or Admin user, when adding an Internal Note, the note is saved and rendered with distinct private styling.
- **AC-17**: Given an authenticated Administrator, when opening User Management, all system users are listed with search and role filtering.
- **AC-18**: Given an Administrator creating a new user with valid details, the user is saved with the specified role and flagged with `mustChangePassword = true`.
- **AC-19**: Given an Administrator attempting to create a user with an existing email, the system rejects the request with HTTP 409 Conflict.
- **AC-20**: Given an Administrator attempting to deactivate their own account, the backend rejects the action with HTTP 400 Bad Request.
- **AC-21**: Given a system with only one active Administrator, when attempting to deactivate or reassign that Administrator's role, the backend rejects the action with HTTP 400 Bad Request.
- **AC-22**: Given an Administrator issuing a new initial password for a user, the user's `mustChangePassword` is set to true and login with the new password forces a password change.
- **AC-23**: Given a non-Administrator user attempting to call `/api/admin/*` endpoints, the backend responds with HTTP 403 Forbidden.
- **AC-24**: Given all major screens across Desktop, Tablet, and Mobile viewports, the Zen Green styling is consistent with no clipping, overlap, or horizontal overflow.

---

## 10. Product Definition of Done (DoD)

- [ ] All 18 Functional Requirements and 26 Business Rules are fully implemented and verified.
- [ ] Database migration successfully transitions from `DevRequester` to `User` while preserving all Lab 2 tickets, categories, systems, and attachments.
- [ ] Idempotent seed script creates all required roles, users, tickets, comments, and notes.
- [ ] All backend endpoints enforce server-side authentication and role-based authorization checks.
- [ ] All client screens match the Zen Green design language and adapt responsively across Desktop, Tablet, and Mobile.
- [ ] 100% of planned automated tests (Unit, API integration, Component, and E2E) execute and pass.
- [ ] Peer review records in `docs/lab-03/reviewer.md` document real feedback and approvals across all feature PRs.
- [ ] Evidence artifacts (screenshots and logs) are organized under `artifacts/lab-03/`.
- [ ] Release branch `lab3-staging` merges cleanly into `main` with full test validation.

---

## 11. Assumptions and Architectural Decisions

1. **Session & Auth Mechanism**: Bearer token architecture with server-side database tracking (`Session` model) for explicit, instant token revocation upon logout.
2. **Password Hashing**: `bcryptjs` utilizing salt rounds of 10 for deterministic, portable, secure hashing without native C++ compilation dependencies.
3. **Queue Sorting & Pagination Defaults**: Staff Queue defaults to sorting by `createdAt` descending, with a default page size of 10 (configurable to 20 or 50).
4. **Requester Resolution Indication**: Modeled as `requesterIndicatedResolved: Boolean` on `Ticket`, visible to IT Staff as an alert badge on Staff Ticket Detail to prompt formal closure without giving Requesters premature closure rights.
