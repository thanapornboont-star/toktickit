# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal
Deliver a production-grade, responsive Requester (end-user) ticketing MVP for TokTickIT using the Zen Green design system. This sprint establishes a simulated Development Requester context (testing mechanism), ticket creation with server-generated unique Ticket Numbers, requester-scoped ticket search/filtering/sorting/pagination in My Tickets, read-only Ticket Detail inspection, and an attachment lifecycle supporting upload, download, and soft-removal with reason tracking.

---

## 2. Stakeholder Request Interpretation
The IT department requires a professional, responsive web application for internal Requesters to report IT issues and track service requests. Prior to the rollout of full authentication in Lab 3, a dedicated Development Requester Selector enables switching between seeded user personas to simulate and verify multi-user ticket ownership and isolation. The application must strictly enforce that Requesters can only access, view, and manage attachments for tickets they own. The user interface must adhere consistently to the Zen Green Theme across desktop, tablet, and mobile viewports.

---

## 3. Scope

### 3.1 Included Scope
- **Development Requester Testing Mechanism**: Selection screen to pick an active seeded requester, stored in `sessionStorage`, propagated to backend via `X-Dev-Requester-Id` header, with clear disclaimers that it is not authentication.
- **Reference Data**: Retrieval of active Categories and Related Systems from PostgreSQL.
- **Ticket Creation**: Responsive form with field validation, atomic unique Ticket Number generation (`TKT-YYYY-XXXXXX`), `NEW` status initialization, and persistence.
- **My Tickets List**: Requester-scoped ticket listing with keyword search (Ticket Number / Summary), Category filter, Priority filter, Status filter, sorting (Created Date, Ticket Number, Priority), pagination (page sizes: 8, 20, 50), and empty/no-results states.
- **Ticket Detail**: Read-only display of ticket metadata, classification, summary, and description.
- **Attachment Lifecycle**: Upload supporting files (JPG, PNG, WEBP, PDF up to 5 MB, max 5 active attachments per ticket), download active attachments, soft-removal with mandatory reason, and retention of audit metadata.
- **Ownership Protection**: Backend enforcement ensuring Requesters cannot view, query, or mutate tickets/attachments owned by other Requesters (returning safe 404 Not Found).
- **Responsive Zen Green UI**: Reusable tokens, accessible form controls, badges, alerts, loading/busy indicators, and responsive layouts across Desktop (>=992px), Tablet (768-991px), and Mobile (<768px).

### 3.2 Excluded Scope (Strictly Prohibited in Lab 2)
- Real Authentication & Security (login forms with passwords, JWT/session cookies, password hashing, role permissions).
- IT Staff Workflow (IT Staff dashboard, ticket claiming, reassigning, IT Priority modification, ticket ownership assignment).
- Ticket Collaboration & Work Tracking (Public Comments, Internal Notes, Actions Taken).
- Ticket Status Lifecycle Transitions beyond `NEW` (no resolving, closing, reopening, cancelling).
- Administrator functions (managing users, categories, or systems).

---

## 4. Functional Requirements (FR)

- **FR-01**: The system shall provide a Development Requester Selector listing all active seeded Requesters.
- **FR-02**: The system shall persist the selected Requester in client storage and supply its identifier in all API requests.
- **FR-03**: The system shall provide a navigation header showing the application identity, navigation links, current selected Requester, and a "Change Requester" action.
- **FR-04**: The system shall load active Categories and Related Systems dynamically from the database for ticket creation.
- **FR-05**: The system shall validate ticket submission inputs on both client and server (Summary, Category, Related System, Requested Priority, Description).
- **FR-06**: The system shall generate an official, immutable, and unique Ticket Number atomically upon ticket creation.
- **FR-07**: The system shall display a success confirmation with the generated Ticket Number upon successful ticket creation while preserving form data if submission fails.
- **FR-08**: The system shall allow Requesters to view a paginated list of their own tickets in "My Tickets".
- **FR-09**: The system shall support keyword search, Category filter, Priority filter, Status filter, and sort order in My Tickets.
- **FR-10**: The system shall display a read-only Ticket Detail view for an owned ticket.
- **FR-11**: The system shall support uploading permitted attachments (JPG, PNG, WEBP, PDF <= 5MB) up to 5 active files per ticket.
- **FR-12**: The system shall allow Requesters to download active attachments and soft-remove attachments by providing a removal reason.

---

## 5. Business Rules (BR)

- **BR-01 (Ticket Number Generation)**: The official Ticket Number is generated exclusively by the backend, must be globally unique, and follows the format `TKT-YYYY-XXXXXX` (e.g., `TKT-2026-000001`).
- **BR-02 (Initial Status)**: Every newly created ticket must begin with current status `NEW`.
- **BR-03 (Testing Context)**: Lab 2 uses a Development Requester selector instead of login. The selected identity is for testing only and is not authentication.
- **BR-04 (Active Requesters Only)**: Only active Development Requesters (`isActive = true`) appear in the selector. Inactive requesters cannot be selected and must be rejected by backend APIs if supplied.
- **BR-05 (Context Storage & Transport)**: The selected requester identity is stored in `sessionStorage` and transmitted via HTTP header `X-Dev-Requester-Id`.
- **BR-06 (Ownership Isolation & 404 Policy)**: A Requester can only view, list, or modify tickets and attachments they own. Requesting a ticket or attachment belonging to another Requester returns `404 Not Found` (to avoid information disclosure).
- **BR-07 (Attachment Constraints)**: Allowed file types are `image/jpeg`, `image/png`, `image/webp`, and `application/pdf`. Maximum file size is 5 MB (5,242,880 bytes). A maximum of 5 active (non-removed) attachments are permitted per ticket.
- **BR-08 (Soft Removal of Attachments)**: Attachments are never hard-deleted. Soft removal flags the record (`isRemoved = true`), records `removedAt` timestamp and mandatory `removalReason`. Removed attachments remain visible in metadata list but cannot be downloaded or previewed.
- **BR-09 (Create Ticket Authority)**: The backend is the sole authority for `ticketNumber`, `status`, `createdAt`, `updatedAt`, and `requesterId`. The request body must not accept `ticketNumber`, `status`, or `requesterId`.
- **BR-10 (Summary & Description Lengths)**: Summary is required, trimmed, between 5 and 100 characters. Description is required, trimmed, between 10 and 2000 characters.
- **BR-11 (Reference Data Integrity)**: Category and Related System must exist in the database and be active.
- **BR-12 (Pagination Defaults)**: My Tickets defaults to page 1, page size 8 (with options for 20 and 50). Sorting defaults to `createdAt` descending.
- **BR-13 (Attachment Retry on Creation)**: If ticket creation succeeds but an initial attachment upload fails, the ticket remains created, and the user can upload attachments from the Ticket Detail view.
- **BR-14 (Requester Switching Effect)**: When the user switches to a different Development Requester, the application clears existing ticket state and reloads data strictly scoped to the new requester.

---

## 6. UI Specification Summary

- **Design System**: Zen Green Theme using designated tokens (Primary `#006B3C`, Secondary `#0B7A46`, Pale `#EAF6EF`, Background `#F5F7F6`, Text `#1A2E26`, Border `#D1DCD6`).
- **Development Requester Selector**: Modal/Screen with banner clarifying test mechanism, active user dropdown, and Continue action.
- **Application Shell**: Header bar with logo, active link indication, Requester avatar badge, and "Change Requester" button.
- **Create Ticket Screen**: Responsive layout with read-only Requester info, Category & Related System dropdowns, Priority selector, Summary input, Description textarea, optional file attachment dropzone, and Submit button with busy state.
- **My Tickets Screen**: Search bar, filter controls, clear filters button, responsive table (Desktop) / card list (Mobile), pagination footer, and distinct empty vs no-results views.
- **Ticket Detail Screen**: Read-only field layout, status/priority badges, attachments table showing active files (with download/remove buttons) and removed files (with removal reason and disabled download), and modal for removal confirmation.

---

## 7. Data Changes & Database Model

### Models in `server/prisma/schema.prisma`:
1. `DevRequester`: `id`, `name`, `email`, `department`, `isActive`, `createdAt`, `updatedAt`
2. `Category`: `id`, `name`, `isActive`, `createdAt` (extend from Lab 1)
3. `RelatedSystem`: `id`, `name`, `description`, `isActive`, `createdAt`
4. `Ticket`: `id`, `ticketNumber` (unique), `summary`, `description`, `requestedPriority`, `status` (default `NEW`), `requesterId`, `categoryId`, `relatedSystemId`, `createdAt`, `updatedAt`
5. `Attachment`: `id`, `ticketId`, `originalFilename`, `storedFilename`, `fileSize`, `mimeType`, `storagePath`, `isRemoved` (default false), `removedAt`, `removalReason`, `createdAt`
6. `TicketSequence`: `year` (Int, unique), `lastNumber` (Int, default 0) for atomic sequential ticket number generation.

---

## 8. API Contract Summary

- `GET /api/dev-requesters`: List active development requesters.
- `GET /api/categories`: List active IT request categories.
- `GET /api/related-systems`: List active related systems.
- `POST /api/tickets`: Create ticket for Requester specified in `X-Dev-Requester-Id` header.
- `GET /api/tickets`: Query owned tickets with search, filters, sorting, and pagination.
- `GET /api/tickets/:id`: Retrieve owned ticket details.
- `POST /api/tickets/:id/attachments`: Upload attachment (multipart/form-data).
- `GET /api/tickets/:id/attachments`: List attachment metadata for ticket.
- `GET /api/tickets/:id/attachments/:attachmentId/download`: Download active attachment binary.
- `DELETE /api/tickets/:id/attachments/:attachmentId`: Soft-remove attachment with removal reason.

---

## 9. Acceptance Criteria (AC)

- **AC-01**: Given valid ticket inputs, when the Requester submits the Create Ticket form, then one ticket is saved with status `NEW` and the official Ticket Number is returned and displayed.
- **AC-02**: Given no Development Requester is selected, when attempting to open ticket screens, then the Requester Selector screen is shown.
- **AC-03**: Given Requester B is active, when requesting a ticket owned by Requester A via API or URL, then `404 Not Found` is returned.
- **AC-04**: Given an inactive Requester ID in `X-Dev-Requester-Id`, when calling any ticket endpoint, then `403 Forbidden` / `400 Bad Request` is returned.
- **AC-05**: Given ticket creation with missing Summary or Description, when submitted, then field-level validation errors are displayed and no ticket is created.
- **AC-06**: Given a search query in My Tickets, when submitted, then only tickets containing the term in Ticket Number or Summary are returned.
- **AC-07**: Given a filter combination in My Tickets, when applied, then only tickets matching all selected criteria are returned.
- **AC-08**: Given an attachment > 5MB or invalid MIME type, when uploaded, then the system rejects the file with a clear error message.
- **AC-09**: Given a ticket with 5 active attachments, when attempting to upload a 6th file, then the upload is rejected.
- **AC-10**: Given an active attachment, when the owner clicks remove and provides a reason, then the attachment is soft-removed, metadata remains visible with the reason, and downloading is disabled.
- **AC-11**: Given a removed attachment ID, when direct download is requested via API, then `404 Not Found` is returned.
- **AC-12**: Given switching from Requester A to Requester B, when navigating to My Tickets, then Requester A's tickets disappear and Requester B's tickets are displayed.

---

## 10. Definition of Done (DoD)

1. All specification documents (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`) reviewed, approved, and merged to `lab2-staging`.
2. Database schema migrated and seeded with 4 Categories, >=6 Related Systems, >=4 active Requesters, and >=1 inactive Requester.
3. All feature increments completed via dedicated feature branches and peer-reviewed Pull Requests into `lab2-staging`.
4. Automated tests (unit, integration, UI component, E2E) cover all ACs and pass with zero failures on `lab2-staging` and final `main`.
5. UI complies with Zen Green design system tokens and responsive requirements without overflow or clipping.
6. Documentation files `reviewer.md` and `ai-use.md` are completed with real evidence.
7. Final release PR merged from `lab2-staging` into `main` by peer reviewer.
8. Submission report generated matching `lab-02-submission-template.md` as one complete PDF.
