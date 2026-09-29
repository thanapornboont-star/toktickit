# Lab 4 Test Plan and Traceability — TokTickIT

## 1. Test Strategy

The Sprint 4 test plan establishes comprehensive multi-level verification (Spec DD, Test DD, and TDD) to validate all Functional Requirements, Business Rules, and Acceptance Criteria across backend APIs, frontend components, and Playwright end-to-end user flows.

### Testing Levels
- **Backend API & Integration Tests**: Supertest + Vitest testing Express routers with live PostgreSQL database, validating Actions Taken CRUD, auto-attribution of performers, RBAC enforcement (Requester 403), ticket status transition state machine, conflict detection (409 Conflict), and authoritative dashboard aggregations.
- **Frontend Component Tests**: Vitest + React Testing Library testing the Staff and Requester Dashboards, metric card calculations, Actions Taken table and modals, follow-up note validation, and status transition select controls.
- **End-to-End (E2E) Suites**: Playwright multi-viewport testing across Desktop, Tablet, and Mobile verifying full user journeys for Actions Taken logging, advisory resolution and staff resolution gate, and dashboard metric drill-downs.
- **Regression Verification**: Re-executing all test suites from Lab 1, Lab 2, and Lab 3 to prove 0 regressions.

---

## 2. Planned Tests Table

| Test ID | Level | AC / BR | Scenario | Expected Result | Automated Test File | Final Status |
|---|---|---|---|---|---|---|
| **API-01** | API | AC-01, BR-01 | Create valid Action Taken by IT Staff | 201 Created; action linked to ticket, performer auto-set to session user | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-02** | API | AC-02, BR-04 | Create Action Taken with `isFollowUpRequired: true` but empty note | 400 Bad Request; field-level validation error | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-03** | API | AC-04, BR-07 | Requester attempts to create Action Taken | 403 Forbidden (RBAC gate) | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-04** | API | AC-03, BR-07 | Requester views Actions Taken on owned ticket | 200 OK; returns action records | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-05** | API | AC-03, BR-07 | Requester views Actions Taken on unowned ticket | 404 Not Found (safe isolation) | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-06** | API | AC-01, BR-03 | Update existing Action Taken by IT Staff | 200 OK; updated fields persisted | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-07** | API | AC-05, BR-09 | Permitted status transition (`OPEN` -> `IN_PROGRESS`) | 200 OK; status updated | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| **API-08** | API | AC-06, BR-09 | Prohibited status transition (`NEW` -> `RESOLVED`) | 400 Bad Request; illegal state transition rejected | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| **API-09** | API | AC-07, BR-10 | Requester indicates problem appears resolved | 200 OK; `requesterIndicatedResolved = true`, status unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| **API-10** | API | AC-08, BR-12 | Stale ticket status update with mismatched timestamp | 409 Conflict; concurrent update rejected | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| **API-11** | API | AC-09, BR-14 | Requester dashboard metrics calculation | 200 OK; authoritative counts for open, waiting, resolved | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pass |
| **API-12** | API | AC-09, BR-14 | Requester dashboard isolation (no leak of other requesters) | 200 OK; counts only user-owned tickets | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pass |
| **API-13** | API | AC-10, BR-15 | IT Staff dashboard operational metrics | 200 OK; unassigned, assigned to me, status & priority counts | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |
| **API-14** | API | AC-11, BR-15 | IT Staff dashboard empty states (zero counts) | 200 OK; zero values handled gracefully | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |
| **UI-01** | UI | AC-01, AC-02 | Actions Taken table render and Create Action modal | Form validation, follow-up note toggle, submit action | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| **UI-02** | UI | AC-03 | Actions Taken read-only display for Requester | Table rendered without add/edit controls | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| **UI-03** | UI | AC-05, AC-07 | Ticket workflow controls and advisory resolution banner | Only permitted transitions listed; advisory banner shown | `client/tests/lab-04/TicketWorkflow.test.tsx` | Pass |
| **UI-04** | UI | AC-10, AC-12 | IT Staff Dashboard metric cards and recent tickets | Cards render accurate counts; drill-down links working | `client/tests/lab-04/StaffDashboard.test.tsx` | Pass |
| **UI-05** | UI | AC-09, AC-11 | Requester Dashboard metrics, recent tickets, empty state | Accurate user metrics, empty state prompt | `client/tests/lab-04/RequesterDashboard.test.tsx` | Pass |
| **E2E-01** | E2E | AC-01..04 | Full Actions Taken lifecycle (create, edit, requester view) | Complete Actions Taken operational workflow | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass |
| **E2E-02** | E2E | AC-05..08 | Ticket resolution workflow & advisory review gate | End-to-end resolution gate verification | `e2e/lab-04/ticket-resolution.spec.ts` | Pass |
| **E2E-03** | E2E | AC-09..12 | Multi-role Dashboards and responsive drill-down | Full dashboard metrics and drill-down navigation | `e2e/lab-04/dashboards.spec.ts` | Pass |

---

## 3. Acceptance Criteria Traceability Matrix

| Acceptance Criterion | Covered By Test IDs | Verification Method |
|---|---|---|
| **AC-01** (Create Action Taken with auto-performer) | `API-01`, `API-06`, `UI-01`, `E2E-01` | Supertest backend test + Vitest modal test + Playwright E2E |
| **AC-02** (Follow-up note required validation) | `API-02`, `UI-01`, `E2E-01` | Backend 400 validation + Frontend inline error assertion |
| **AC-03** (Requester read-only Actions Taken) | `API-04`, `API-05`, `UI-02`, `E2E-01` | Backend ownership query + Frontend read-only DOM test |
| **AC-04** (Requester forbidden from creating action) | `API-03`, `E2E-01` | Supertest 403 assertion + E2E permission boundary |
| **AC-05** (Permitted ticket status transition) | `API-07`, `UI-03`, `E2E-02` | State transition API test + Dropdown selection test |
| **AC-06** (Invalid status transition rejected) | `API-08`, `UI-03` | Supertest 400 Bad Request test + UI option exclusion |
| **AC-07** (Requester advisory resolution indicator) | `API-09`, `UI-03`, `E2E-02` | Advisory endpoint test + Staff warning banner test |
| **AC-08** (Stale update / 409 Conflict guard) | `API-10`, `E2E-02` | Supertest 409 Conflict assertion with timestamp mismatch |
| **AC-09** (Requester dashboard authoritative metrics) | `API-11`, `API-12`, `UI-05`, `E2E-03` | Backend SQL aggregation test + Requester UI component test |
| **AC-10** (IT Staff dashboard operational metrics) | `API-13`, `UI-04`, `E2E-03` | Backend SQL aggregation test + Staff dashboard UI test |
| **AC-11** (Dashboard zero/empty state handling) | `API-14`, `UI-05`, `E2E-03` | Zero-count DB test + empty state DOM verification |
| **AC-12** (Multi-viewport responsive & accessibility) | `UI-04`, `UI-05`, `E2E-03` | Playwright Desktop, Tablet, Mobile responsive assertions |
