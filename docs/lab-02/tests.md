# Lab 2 Test Plan and Traceability - TokTickIT

## 1. Test Strategy

The testing strategy ensures complete coverage of all Acceptance Criteria and Business Rules across multiple testing levels:
- **Unit Tests**: Verification of Ticket Number format generators, validation rules, query builder whitelists.
- **Backend API / Integration Tests**: Supertest + Vitest testing of Express routers against live PostgreSQL database.
- **Frontend Component / UI Tests**: React Testing Library + Vitest testing form validations, render states, mock API responses, Zen Green styling tokens.
- **End-to-End (E2E) & Visual QA**: Playwright automated flows across Desktop, Tablet, and Mobile viewports with screenshot capture.

---

## 2. Planned Tests Table

| Test ID | Level | AC / BR | Scenario | Expected Result | Actual Test File | Final Status |
|---|---|---|---|---|---|---|
| **API-01** | API | BR-04, BR-11 | List active dev-requesters, categories, and related-systems | 200 OK containing only active records | `server/tests/lab-02/dev-requesters.api.test.ts` | Pass |
| **API-02** | API | AC-04, BR-05 | Context middleware rejects missing or inactive `X-Dev-Requester-Id` | 400 Bad Request / 403 Forbidden | `server/tests/lab-02/dev-requesters.api.test.ts` | Pass |
| **API-03** | API | AC-01, BR-01 | Create ticket with valid data | 201 Created; returns official `TKT-YYYY-XXXXXX` | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| **API-04** | API | AC-05, BR-10 | Create ticket with missing summary/description | 400 Bad Request; field-specific validation errors | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| **API-05** | API | BR-09 | Reject client-supplied `ticketNumber` or `requesterId` in body | Backend overrides or rejects values | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| **API-06** | API | AC-06, BR-12 | Query tickets with keyword search | Returns only matching tickets for requester | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| **API-07** | API | AC-07, BR-12 | Query tickets with combined filters and pagination | Returns tickets matching all criteria | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| **API-08** | API | AC-03, BR-06 | Retrieve Ticket Detail owned by another requester | 404 Not Found (safe ownership rejection) | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| **API-09** | API | AC-08, BR-07 | Upload valid file; reject invalid MIME and file > 5 MB | 201 Created / 413 Payload Too Large / 415 Unsupported Type | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| **API-10** | API | AC-09, BR-07 | Upload 6th active attachment to a ticket | 400 Bad Request; max 5 limit reached | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| **API-11** | API | AC-10, BR-08 | Soft remove attachment with a valid 5–255 character reason | 200 OK; `isRemoved: true`, reason recorded | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| **API-12** | API | AC-11, BR-08 | Download soft-removed attachment | 404 Not Found; download blocked while metadata remains visible | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| **UI-01** | UI | AC-02, BR-03, BR-04, BR-05 | Render Requester Selector if unselected; validate selected context | Shows loading/error/empty states, active users dropdown, session persistence, and revalidation | `client/tests/lab-02/RequesterSelector.test.tsx` | Pass |
| **UI-02** | UI | AC-05, BR-10 | Submit Create Ticket with empty fields | Shows inline red validation errors | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| **UI-03** | UI | AC-01, BR-01 | Submit Create Ticket successfully | Shows success banner with Ticket Number | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| **UI-04** | UI | AC-12, BR-14 | Switch Requester in shell | Clears previous tickets and reloads for new user | `client/tests/lab-02/MyTickets.test.tsx` | Pass |
| **UI-05** | UI | AC-10, BR-08 | Remove attachment via confirmation modal | Modal requires reason >= 5 chars, updates UI | `client/tests/lab-02/TicketDetail.test.tsx` | Planned |
| **E2E-01** | E2E | AC-01..12 | Complete user flow: select -> create -> list -> detail -> remove | Full flow succeeds across all viewports | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |

---

## 3. Acceptance Criteria Traceability Matrix

| Acceptance Criterion | Covered By Test IDs | Verification Method |
|---|---|---|
| **AC-01** (Ticket Creation & Official Number) | `API-03`, `UI-03`, `E2E-01` | Automated API 201 response + UI Ticket Number rendered |
| **AC-02** (Selector Required when Unset) | `UI-01`, `E2E-01` | Navigation redirected / selector displayed |
| **AC-03** (Cross-Requester Ticket Access 404) | `API-08`, `E2E-01` | API returns 404 and UI displays not found |
| **AC-04** (Inactive Requester Rejection) | `API-01`, `API-02` | API returns 403 / 400 |
| **AC-05** (Field Validation & Error Placement) | `API-04`, `UI-02` | Inline error messages placed under respective inputs |
| **AC-06** (Ticket Keyword Search) | `API-06`, `E2E-01` | Filtered list matches substring |
| **AC-07** (Combined Filter & Pagination) | `API-07`, `E2E-01` | Query results obey category, priority, page sizes |
| **AC-08** (Attachment Type & Size Constraints) | `API-09` | Rejection of non-whitelisted MIME and files > 5MB |
| **AC-09** (Maximum 5 Active Attachments) | `API-10` | 6th upload blocked with informative error |
| **AC-10** (Attachment Soft-Removal with Reason) | `API-11`, `UI-05` | Metadata retained, reason saved, status updated |
| **AC-11** (Blocked Download on Removed File) | `API-12` | Download binary endpoint returns 404 |
| **AC-12** (Requester Switching Data Isolation) | `UI-04`, `E2E-01` | Requester A data disappears when switching to B |

---

## 4. Responsive and Visual Checklist

- [ ] **Desktop (>=992px)**: Header, navigation, multi-column Create Ticket form, table layout in My Tickets, max-width centered container.
- [ ] **Tablet (768px - 991px)**: Form fields adapt gracefully, table remains readable without breaking page width.
- [ ] **Mobile (<768px)**: Stacked single-column fields, cards in My Tickets, full-width touch buttons, zero horizontal overflow.
- [ ] **Zen Green Styling**: Verification of `#006B3C` headers/buttons, `#EAF6EF` selection highlights, `#F5F7F6` background.
- [ ] **Read-only Distinction**: Visual difference between editable and read-only inputs.

---

## 5. Test Execution Commands

```bash
# Backend Integration Tests
npm --prefix server test -- --run

# Frontend Component Tests
npm --prefix client test -- --run

# Playwright E2E Tests
npx playwright test
```
