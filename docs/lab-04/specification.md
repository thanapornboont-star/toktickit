# Lab 4 Sprint Engineering Specification — TokTickIT

## 1. Sprint Goal

Deliver the complete TokTickIT service-desk operational workflow by introducing structured **Actions Taken** work logging under tickets, enforcing strict **Ticket Status Transitions and Resolution Gate Rules**, providing role-tailored **Operational Dashboards** for Requesters and IT Staff, and **hardening the entire application** against regressions from Labs 1–3 under the **Zen Green** design language.

---

## 2. Stakeholder Request Interpretation

The stakeholder stated:
> *"The service desk can now receive Tickets and IT Staff can communicate with Requesters, but we still need a reliable way to plan and track the actual work. Add Actions Taken under each Ticket. Each action should contain Action Date/Time, Action Description, Result, Performed by (auto), Follow-Up Required?, Follow-up Note (required when follow-up is needed), Attachment Notes (what file to look for images etc.).*  
> *The primary Ticket Owner remains responsible for coordinating the Ticket as a whole. Requesters may continue to indicate that the problem appears resolved, but IT Staff must review the work and formally update the Ticket.*  
> *Add useful dashboards for Requesters and IT Staff, but keep them concise and connected to the detailed screens. Finally, polish and harden the complete application so that all earlier features continue to work consistently under the Zen Green design language."*

In response, this sprint equips IT Staff and Administrators with a parent-child work logging mechanism (`ActionTaken`), ensuring work is auditable by date, description, outcome, performer, follow-up necessity, and referenced attachments. The primary Ticket Owner remains the coordinator, but any authorized IT Staff member may record an Action Taken. Ticket resolution is strictly gated: a Requester's "Problem Appears Resolved" indication remains purely advisory, requiring formal verification and resolution status transition by IT Staff. Role-appropriate dashboards deliver authoritative operational metrics and drill-down shortcuts to queues and details without duplicating full screens. All prior features (authentication, RBAC, ticket creation, attachments, comments, internal notes, user management) are preserved with zero regression.

---

## 3. Scope

### 3.1 Included Scope
- **Actions Taken Lifecycle**:
  - Parent-child relation: One Ticket has zero, one, or many Actions Taken.
  - Required attributes: Action Date/Time, Action Description, Result, Performed by (auto-populated from authenticated session), Follow-Up Required flag, Follow-Up Note (conditionally mandatory), Attachment Notes (optional pointer to files/images).
  - RBAC: IT Staff and Administrators can create and edit Actions Taken on accessible tickets. Requesters can view Actions Taken for tickets they own (read-only).
- **Ticket Workflow & Resolution Gate**:
  - Enforce status state machine: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`.
  - Backend resolution gate: Only IT Staff and Administrators can transition a ticket to `RESOLVED` or `CLOSED`.
  - Requester advisory resolution indication: Updates advisory flag `requesterIndicatedResolved` without changing the ticket status to `RESOLVED`.
  - Stale update and concurrency guard: Optimistic concurrency check via `updatedAt` to prevent unintentional overwrite of concurrent workflow changes.
- **Role-Appropriate Operational Dashboards**:
  - **Requester Dashboard**:
    - Summary counts: Total Open Tickets, Waiting for Requester, Recently Updated Tickets, Recently Resolved Tickets.
    - Recent Tickets table/list with status badges and navigation to Ticket Detail.
    - Empty states and zero-count handling.
  - **IT Staff Dashboard**:
    - Operational metric cards: Unassigned Tickets, Assigned to Me, Breakdown by Status, Breakdown by IT Priority, Recently Updated Tickets.
    - Recent/Urgent Tickets list with drill-down links pre-filtering the IT Staff Queue or navigating to Ticket Detail.
    - Quick actions: Create Ticket, Search Tickets, Filter Queue.
  - **Administrator Dashboard**:
    - Inherits IT Staff dashboard operational views plus concise user-account summary counters (Total Users, Active Users, Inactive Users, Role distribution).
- **Database Increment & Seed Data**:
  - Non-destructive Prisma migration introducing `ActionTaken` model and indexes.
  - Idempotent seed data providing realistic tickets across all statuses, priorities, assigned/unassigned states, and varying counts of Actions Taken (0, 1, and multiple) to validate non-zero and zero metric cards.
- **Product Hardening & Visual Quality**:
  - Full regression preservation of Labs 1–3 features.
  - Uniform Zen Green design language (`#006B3C`, `#0B7A46`, `#EAF6EF`).
  - Strict responsive behavior across Desktop (≥992px), Tablet (768–991px), and Mobile (<768px).
  - Accessibility compliance: Visible keyboard focus, minimum 44px touch targets, semantic form labels, non-color status cues.

### 3.2 Explicitly Excluded Scope (Out of Bounds)
- Automatic SLA countdown clocks, escalation background engines, and on-call paging.
- External notification transports (email, SMS, LINE, push notifications, webhooks).
- Inventory consumption, spare-parts tracking, procurement, or labor-cost accounting.
- Timesheet billing, payroll calculations, or technician hourly billing.
- Multi-tier formal approval workflows or digital cryptographic signatures.
- Business intelligence report builders, OLAP warehouses, or automated export pipelines.
- Multi-tenant enterprise organizations or multi-region cloud clustering.
- Any unapproved feature outside the Sprint 4 engineering contract.

---

## 4. Functional Requirements (FR)

### Actions Taken Management
- **FR-01**: The system shall allow authorized IT Staff and Administrators to log a new Action Taken under an existing ticket, recording Action Date/Time, Description, Result, Follow-Up Required flag, Follow-Up Note (mandatory if follow-up required is true), and optional Attachment Notes.
- **FR-02**: The system shall automatically record the authenticated user as the performer (`performedById`) of an Action Taken, preventing client spoofing of performer identity.
- **FR-03**: The system shall allow authorized IT Staff and Administrators to update existing Actions Taken on accessible tickets.
- **FR-04**: The system shall allow Requesters to view Actions Taken in read-only mode for tickets they own.
- **FR-05**: The system shall prevent Requesters from creating, modifying, or deleting Actions Taken, returning HTTP 403 Forbidden on any write attempt.

### Ticket Status Workflow & Resolution Gate
- **FR-06**: The system shall restrict ticket status changes strictly according to the approved status transition matrix.
- **FR-07**: The system shall treat Requester "Problem Appears Resolved" inputs as advisory only (`requesterIndicatedResolved = true`), displaying an advisory banner to IT Staff without altering ticket status.
- **FR-08**: The system shall require IT Staff or Administrator action to formally transition a ticket to `RESOLVED` or `CLOSED`.
- **FR-09**: The system shall detect stale updates during ticket workflow modifications using optimistic concurrency checking (`updatedAt` timestamp), rejecting conflicting modifications with HTTP 409 Conflict.

### Operational Dashboards
- **FR-10**: The system shall provide an authenticated Requester Dashboard displaying authoritative metrics: Total Open Tickets, Tickets Waiting for Requester, Recently Updated Tickets, and Recently Resolved Tickets for the current user.
- **FR-11**: The system shall provide an IT Staff Dashboard displaying authoritative operational metrics: Unassigned Tickets, Tickets Assigned to Me, Ticket counts by Status, Ticket counts by IT Priority, and Recently Updated Tickets.
- **FR-12**: The system shall provide interactive drill-down navigation from dashboard metric cards to the corresponding filtered Ticket Queue or Ticket Detail views.
- **FR-13**: The system shall provide concise user account summary metrics on the Administrator view.
- **FR-14**: The system shall display clean empty states with contextual guidance whenever dashboard metrics or recent lists have zero matching records.

### System Hardening & Accessibility
- **FR-15**: The system shall preserve all functionality from Labs 1–3 (authentication, password changes, Requester ticket creation, attachments, public comments, internal notes, and admin user management).
- **FR-16**: The system shall provide responsive UI layouts across Desktop, Tablet, and Mobile viewports without horizontal scrolling, clipped content, or overlapping elements.
- **FR-17**: The system shall provide accessible form controls, clear keyboard focus outlines, and minimum 44px touch targets on mobile viewports.

---

## 5. Business Rules (BR)

### Actions Taken Rules
- **BR-01 (Ticket Ownership & Scope)**: An Action Taken belongs to exactly one Ticket (`ticketId`). It cannot exist independently or be transferred across tickets.
- **BR-02 (Distributed Performer Responsibility)**: The primary Ticket Owner coordinates the ticket as a whole, but an Action Taken may be recorded by any active IT Staff member or Administrator, not only the ticket owner.
- **BR-03 (Automated Performer Attribution)**: The `performedById` attribute must be set by the server from the authenticated session token. Client-supplied performer IDs are strictly ignored.
- **BR-04 (Follow-up Note Dependency)**: If `isFollowUpRequired` is `true`, `followUpNote` is strictly required and must contain non-empty trimmed text (minimum 3 characters, maximum 1,000 characters). If `isFollowUpRequired` is `false`, `followUpNote` is optional or cleared.
- **BR-05 (Action Taken Content Integrity)**: `description` and `result` must each contain non-empty trimmed text (minimum 3 characters, maximum 2,000 characters).
- **BR-06 (Action Date/Time Rules)**: `actionDateTime` defaults to the current server timestamp if not provided, and must not be set to a future date beyond 5 minutes of server time.
- **BR-07 (Requester Read-Only Access)**: Requesters can view Actions Taken only on tickets where `requesterId == session.userId`. Requesters have no create, update, or delete permissions (HTTP 403 Forbidden).

### Ticket Status Workflow & Resolution Rules
- **BR-08 (Permitted Ticket Statuses)**: Permitted statuses remain: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`.
- **BR-09 (Status Transition Matrix)**:
  | Current Status | Permitted Next Statuses | Permitted Actors |
  |---|---|---|
  | `NEW` | `OPEN`, `IN_PROGRESS`, `CANCELLED` | IT Staff, Administrator |
  | `OPEN` | `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED` | IT Staff, Administrator |
  | `IN_PROGRESS` | `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED` | IT Staff, Administrator |
  | `WAITING_FOR_REQUESTER` | `IN_PROGRESS`, `RESOLVED`, `CANCELLED` | IT Staff, Administrator |
  | `RESOLVED` | `CLOSED`, `REOPENED` | IT Staff, Administrator |
  | `REOPENED` | `IN_PROGRESS`, `RESOLVED`, `CANCELLED` | IT Staff, Administrator |
  | `CLOSED` | *Terminal State* | None |
  | `CANCELLED` | *Terminal State* | None |
- **BR-10 (Resolution Authority Gate)**: Requester indication that the problem appears resolved (`requesterIndicatedResolved = true`) is purely advisory. The ticket status remains unchanged until an IT Staff or Administrator explicitly reviews and transitions the ticket to `RESOLVED`.
- **BR-11 (Direct API Resolution Defense)**: The backend API must reject any client request from a Requester attempting to set `status = RESOLVED` or `CLOSED` with HTTP 403 Forbidden, even if API requests bypass the client frontend.
- **BR-12 (Concurrency & Conflict Protection)**: Workflow state transitions must supply the client's known `updatedAt` timestamp. If the database `updatedAt` differs from the client payload, the request must fail with HTTP 409 Conflict with message `Ticket has been updated by another user. Please refresh and retry.`

### Dashboard Calculation Rules
- **BR-13 (Authoritative Backend Calculations)**: Dashboard metrics must be calculated authoritatively by backend SQL/Prisma aggregations, not by client-side filtering of full collections.
- **BR-14 (Requester Dashboard Metric Definitions)**:
  - `totalOpen`: Count of tickets where `requesterId == session.userId` and `status IN ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED')`.
  - `waitingForRequester`: Count of tickets where `requesterId == session.userId` and `status == 'WAITING_FOR_REQUESTER'`.
  - `recentlyUpdated`: Count of tickets owned by requester updated within the last 7 calendar days.
  - `recentlyResolved`: Count of tickets owned by requester where `status IN ('RESOLVED', 'CLOSED')` updated within the last 7 calendar days.
- **BR-15 (IT Staff Dashboard Metric Definitions)**:
  - `unassigned`: Count of active tickets (`status NOT IN ('CLOSED', 'CANCELLED')`) where `ownerId IS NULL`.
  - `assignedToMe`: Count of active tickets where `ownerId == session.userId`.
  - `byStatus`: Aggregated counts grouped by all active statuses (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `REOPENED`).
  - `byPriority`: Aggregated counts grouped by `itPriority` (`HIGH`, `MEDIUM`, `LOW`) for active tickets.
  - `recentlyUpdated`: Count of tickets updated within the last 24 hours.
- **BR-16 (Drill-Down Query Alignment)**: Clicking any dashboard metric card must navigate to the appropriate queue or detail view with query parameters matching the exact filter criteria used to compute the count.

---

## 6. UI Specification Summary

### Screen Structure & Layout
1. **Application Shell**:
   - Navigation links adapted by role:
     - Requester: `Dashboard` (new default home), `My Tickets`, `Create Ticket`, User Profile dropdown.
     - IT Staff: `Dashboard` (new default home), `Ticket Queue`, `Create Ticket`, User Profile dropdown.
     - Administrator: `Dashboard`, `Ticket Queue`, `User Management`, `Create Ticket`, User Profile dropdown.
   - Active route highlighted with solid Zen Green border and pill background.
2. **IT Staff Dashboard (`/dashboard`)**:
   - Welcome banner with current user name and today's summary.
   - 5 primary metric cards: `New`, `Open`, `In Progress`, `Waiting for Requester`, `My Assigned`.
   - Priority distribution widget: Visual indicators for High, Medium, Low priority workload.
   - Recent Tickets table (Ticket Number, Summary, Status pill, Last Updated, Owner).
   - Quick Action buttons: `Create Ticket`, `Search Tickets`, `My Queue`.
3. **Requester Dashboard (`/requester/dashboard` or `/dashboard`)**:
   - Welcome banner.
   - 4 metric cards: `My Open Tickets`, `In Progress`, `Resolved`, `Closed`.
   - Recent Tickets list with status badges and timestamps.
   - Quick Action shortcuts: `Create Ticket`, `View My Tickets`.
4. **Actions Taken Section on Ticket Detail**:
   - Dedicated card container placed below ticket description and above communications.
   - List/Table of recorded actions with columns: Date/Time, Description, Result, Performed By, Follow-Up badge, Attachment Notes.
   - "Add Action Taken" button (visible only to IT Staff and Administrators).
   - Create/Edit Modal with form fields:
     - Action Date & Time (datetime-local picker, defaults to current time).
     - Action Description (multiline textarea, required).
     - Result (multiline textarea, required).
     - Follow-Up Required (checkbox toggle).
     - Follow-Up Note (conditionally visible and required when checkbox is active).
     - Attachment Notes (optional text input).
   - Clear read-only rendering for Requesters without modification buttons.
5. **Ticket Workflow & Resolution Gate Controls**:
   - Contextual Status transition dropdown showing only permitted next states based on `BR-09`.
   - Prominent advisory alert banner when `requesterIndicatedResolved = true`:
     > *"Requester indicated this issue appears resolved. Review Actions Taken and formally resolve the ticket."*
   - Formal Resolve button with confirmation dialog.

---

## 7. Data Changes & Database Decisions

### Prisma Model Changes

```prisma
model ActionTaken {
  id                 Int      @id @default(autoincrement())
  ticketId           Int
  ticket             Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  
  actionDateTime     DateTime @default(now())
  description        String
  result             String
  
  performedById      Int
  performedBy        User     @relation("PerformedActions", fields: [performedById], references: [id])
  
  isFollowUpRequired Boolean  @default(false)
  followUpNote       String?
  attachmentNotes    String?
  
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([ticketId])
  @@index([performedById])
  @@index([actionDateTime])
}
```

### User Model Relation Addition
```prisma
model User {
  // Existing fields preserved...
  performedActions ActionTaken[] @relation("PerformedActions")
}
```

### Ticket Model Relation Addition
```prisma
model Ticket {
  // Existing fields preserved...
  actionsTaken ActionTaken[]
}
```

### Database Design Justifications (Mandatory requirement: 2 justified decisions)
1. **Decision 1: Normalized `ActionTaken` Relational Model with Explicit Foreign Keys vs. JSON Blob**:
   - *Rationale*: Actions Taken represent critical audit records in service desk compliance. A dedicated relational entity with foreign keys (`ticketId`, `performedById`) and indexed timestamps guarantees referential integrity, supports fast dashboard aggregations, and prevents race conditions during concurrent updates.
2. **Decision 2: Optimistic Concurrency Control via `updatedAt` Timestamp Checking**:
   - *Rationale*: IT service desks frequently have multiple staff members collaborating on urgent tickets. By requiring clients to submit their fetched `updatedAt` timestamp on status and workflow changes, the server rejects stale submissions (HTTP 409 Conflict), preventing staff members from inadvertently overwriting another technician's recent status transition.

### Seed & Migration Continuity
- Existing tickets from Labs 1–3 are preserved without modification.
- Legacy tickets without actions taken continue to function seamlessly (`actionsTaken` returns an empty array).
- Seed script is idempotent, resetting sequences safely and injecting tickets across all statuses with 0, 1, and multiple Actions Taken.

---

## 8. REST API Contract Summary

| Method | Endpoint | Authorized Roles | Description |
|---|---|---|---|
| `GET` | `/api/tickets/:id/actions-taken` | Authenticated | List Actions Taken for a ticket (ownership verified for Requesters). |
| `POST` | `/api/tickets/:id/actions-taken` | `IT_STAFF`, `ADMINISTRATOR` | Create a new Action Taken; performer is automatically session user. |
| `PUT` | `/api/tickets/:id/actions-taken/:actionId` | `IT_STAFF`, `ADMINISTRATOR` | Update an existing Action Taken. |
| `PATCH` | `/api/tickets/:id/status` | `IT_STAFF`, `ADMINISTRATOR` | Transition ticket status adhering to state matrix and concurrency check. |
| `GET` | `/api/dashboard/requester` | `REQUESTER` | Retrieve operational summary metrics for authenticated Requester. |
| `GET` | `/api/dashboard/staff` | `IT_STAFF`, `ADMINISTRATOR` | Retrieve operational queue metrics, status distribution, and priority counts. |

---

## 9. Acceptance Criteria (AC)

- **AC-01**: Given an authenticated IT Staff user, when submitting a valid Action Taken with description and result, then the action is created under the specified ticket and `performedById` is automatically bound to the authenticated user.
- **AC-02**: Given an IT Staff user creating an Action Taken with `isFollowUpRequired = true`, when `followUpNote` is empty or missing, then the API rejects the request with HTTP 400 Bad Request and field-level validation error.
- **AC-03**: Given an authenticated Requester viewing their owned ticket, when the ticket has recorded Actions Taken, then the Actions Taken list is displayed in read-only format with no create, edit, or delete controls.
- **AC-04**: Given an authenticated Requester attempting to call `POST /api/tickets/:id/actions-taken`, when the request is processed, then the backend rejects the request with HTTP 403 Forbidden.
- **AC-05**: Given an authenticated IT Staff user, when changing ticket status according to permitted transitions (e.g., `OPEN` -> `IN_PROGRESS`), then the status is successfully updated and a 200 OK response is returned.
- **AC-06**: Given a client attempting an invalid status transition (e.g., `NEW` -> `RESOLVED`), when submitted to the backend, then the request is rejected with HTTP 400 Bad Request.
- **AC-07**: Given a Requester who clicks "Problem Appears Resolved", when processed, then `requesterIndicatedResolved` becomes `true` while the ticket status remains unchanged.
- **AC-08**: Given an IT Staff user submitting a status transition with an outdated `updatedAt` timestamp, when processed, then the backend rejects with HTTP 409 Conflict.
- **AC-09**: Given an authenticated Requester calling `GET /api/dashboard/requester`, when executed, then the returned counts and recent tickets reflect only tickets where `requesterId == session.userId`.
- **AC-10**: Given an authenticated IT Staff user calling `GET /api/dashboard/staff`, when executed, then the metrics accurately reflect database aggregations for unassigned, assigned to me, status counts, and priority counts.
- **AC-11**: Given a user with zero matching tickets or actions, when viewing the dashboard, then clean empty state cards and zero counters are displayed gracefully without client errors.
- **AC-12**: Given any screen in the application on mobile (<768px), tablet (768–991px), and desktop (≥992px), when rendered, then all controls, cards, and tables fit without horizontal overflow and buttons have ≥44px touch targets.

---

## 10. Definition of Done (DoD)

- [ ] All 17 Functional Requirements and 16 Business Rules implemented and verified.
- [ ] Database schema updated via non-destructive Prisma migration preserving all prior data.
- [ ] Idempotent seed script populates diverse tickets with 0, 1, and multi Actions Taken.
- [ ] Backend Supertest API test suites pass 100% (`actions-taken.api.test.ts`, `ticket-workflow.api.test.ts`, `staff-dashboard.api.test.ts`, `requester-dashboard.api.test.ts`).
- [ ] Client component Vitest suites pass 100% (`StaffDashboard.test.tsx`, `RequesterDashboard.test.tsx`, `ActionsTaken.test.tsx`, `TicketWorkflow.test.tsx`).
- [ ] Playwright E2E suites pass across Desktop, Tablet, and Mobile (`actions-taken-flow.spec.ts`, `ticket-resolution.spec.ts`, `dashboards.spec.ts`).
- [ ] All regression test suites from Labs 1–3 pass with 0 failures.
- [ ] Code formatted, linted, with zero console errors or uncaught promises.
- [ ] Peer review completed and logged in `docs/lab-04/reviewer.md` with partner approvals.
- [ ] Single concise PDF submission report compiled with headings `Answer Part 1` through `Answer Part 9`.

---

## 11. Assumptions and Meaningful Decisions

1. **Dashboard Refresh**: Dashboards provide a manual "Refresh" button in addition to automatic fetching on page mount, allowing users to re-fetch authoritative data without a hard browser reload.
2. **Date Boundaries**: "Recently updated" metrics on the IT Staff dashboard use a 24-hour sliding window, whereas the Requester dashboard uses a 7-day sliding window to balance urgency with visibility.
3. **Action Taken Timestamps**: Although `actionDateTime` defaults to the moment of creation, IT Staff can select an earlier timestamp (e.g., when recording work performed earlier in the field), but cannot select future timestamps.
