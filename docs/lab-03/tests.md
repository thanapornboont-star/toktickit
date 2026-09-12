# Lab 3 Test Plan and Traceability — TokTickIT

## 1. Test Strategy

The Sprint 3 test plan applies Test-Driven Development (TDD) and multi-level verification to ensure all 24 Acceptance Criteria, 18 Functional Requirements, and 26 Business Rules are rigorously satisfied before release.

### Testing Levels
- **Unit & Security Rules**: Password policy validators, status transition state machine, token generation and hash verification.
- **Backend API & Integration Tests**: Supertest + Vitest testing Express routers with live PostgreSQL database, validating authentication, RBAC boundaries, safe error codes (401, 403, 404, 409), query filters, and data integrity.
- **Frontend Component Tests**: Vitest + React Testing Library testing form validation, UI state transitions, mock API responses, and Zen Green style tokens.
- **End-to-End (E2E) Suites**: Playwright multi-viewport testing of full user workflows across Requesters, IT Staff, and Administrators.
- **Regression Tests**: Preserving 100% pass rates for Lab 1 and Lab 2 suites.

---

## 2. Planned Tests Table

| Test ID | Level | AC / BR | Scenario | Expected Result | Automated Test File | Final Status |
|---|---|---|---|---|---|---|
| **API-01** | API | AC-01, BR-01 | Valid user login | 200 OK; returns bearer session token and user profile | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-02** | API | AC-02, BR-02 | Login with incorrect password or unknown email | 401 Unauthorized; generic error message | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-03** | API | AC-03, BR-01 | Login with deactivated account (`isActive: false`) | 403 Forbidden; deactivated account message | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-04** | API | AC-04, BR-03 | Authenticated user with `mustChangePassword: true` | Protected routes return 403 until password changed | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-05** | API | AC-04, BR-04 | User changes password adhering to policy | 200 OK; `mustChangePassword` set to `false` | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-06** | API | AC-05, BR-06 | User calls logout endpoint | 200 OK; session token invalidated; future calls 401 | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-07** | API | AC-06, BR-07 | Requester creates ticket using authenticated identity | 201 Created; client-supplied requester ID ignored | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| **API-08** | API | AC-07, BR-09 | Requester accesses unowned ticket | 404 Not Found (safe ownership rejection) | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| **API-09** | API | AC-08, BR-17 | Requester / Staff posts valid Public Comment | 201 Created; author and timestamp set by server | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| **API-10** | API | AC-09, BR-16 | Requester sets "Problem Appears Resolved" | 200 OK; flag set to true without closing ticket | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| **API-11** | API | AC-10, BR-18 | Requester requests Internal Notes | 403 Forbidden; note content not exposed | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| **API-12** | API | AC-11, BR-19 | IT Staff queries ticket queue with search and filters | 200 OK; matching tickets and pagination metadata | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| **API-13** | API | AC-11, BR-10 | Requester queries IT Staff queue endpoint | 403 Forbidden (RBAC enforcement) | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| **API-14** | API | AC-12, BR-12 | IT Staff retrieves staff ticket detail | 200 OK; full operational data and attachments | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| **API-15** | API | AC-13, BR-12 | IT Staff claims unassigned ticket ownership | 200 OK; `ownerId` set to authenticated user | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| **API-16** | API | AC-14, BR-15 | IT Staff updates status along permitted transition | 200 OK; new status saved | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| **API-17** | API | AC-15, BR-15 | IT Staff attempts illegal transition (`NEW` -> `CLOSED`) | 400 Bad Request; transition rejected | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| **API-18** | API | AC-16, BR-18 | IT Staff / Admin posts and retrieves Internal Notes | 201 Created / 200 OK; notes returned | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| **API-19** | API | AC-17, BR-10 | Admin lists users with search and role filter | 200 OK; list of user summaries | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| **API-20** | API | AC-18, BR-24 | Admin creates new user with one role | 201 Created; `mustChangePassword: true` | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| **API-21** | API | AC-19, BR-20 | Admin creates user with duplicate email | 409 Conflict | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| **API-22** | API | AC-20, BR-21 | Admin attempts self-deactivation | 400 Bad Request; self-deactivation blocked | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| **API-23** | API | AC-21, BR-22 | Admin attempts to deactivate last active admin | 400 Bad Request; last admin protected | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| **API-24** | API | AC-22, BR-24 | Admin resets initial password for user | 200 OK; user forced to change password on next login | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| **API-25** | API | AC-23, BR-10 | Non-Admin user calls Admin endpoints | 403 Forbidden | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| **UI-01** | UI | AC-01, AC-02 | Login component render, validation, and safe error | Inline validation and safe error banner | `client/tests/lab-03/Login.test.tsx` | Pass |
| **UI-02** | UI | AC-04 | Change Password form and password checklist | Real-time checklist validation and submission | `client/tests/lab-03/ChangePassword.test.tsx` | Pass |
| **UI-03** | UI | AC-11 | Staff Ticket Queue table, filters, and pagination | Filter inputs and status/priority badges render | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| **UI-04** | UI | AC-12..16 | Staff Ticket Detail controls and distinct notes | Claim button, status dropdown, distinct notes panel | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Planned |
| **UI-05** | UI | AC-17..22 | Admin User Management list and modals | User table, Create/Edit modals, deactivation guard | `client/tests/lab-03/UserManagement.test.tsx` | Planned |
| **E2E-01** | E2E | AC-01..05 | Login, first-login password change, and logout | End-to-end authentication lifecycle | `e2e/lab-03/authentication.spec.ts` | Planned |
| **E2E-02** | E2E | AC-11..16 | Staff queue search, claim, status, comments, notes | Complete IT Staff operational ticketing flow | `e2e/lab-03/staff-ticket-flow.spec.ts` | Planned |
| **E2E-03** | E2E | AC-17..23 | Admin user search, create, edit, deactivate guard | Full administrator user lifecycle | `e2e/lab-03/user-administration.spec.ts` | Planned |

---

## 3. Acceptance Criteria Traceability Matrix

| Acceptance Criterion | Covered By Test IDs | Verification Method |
|---|---|---|
| **AC-01** (Valid Authentication & Session) | `API-01`, `UI-01`, `E2E-01` | Supertest returns 200 + Bearer token; Login UI updates shell state |
| **AC-02** (Invalid Credentials Safe Rejection) | `API-02`, `UI-01`, `E2E-01` | 401 Unauthorized with generic message; UI safe banner |
| **AC-03** (Deactivated Account Rejection) | `API-03`, `UI-01`, `E2E-01` | 403 Forbidden with deactivation notice |
| **AC-04** (Mandatory First Password Change) | `API-04`, `API-05`, `UI-02`, `E2E-01` | Functional routes blocked until valid change succeeds |
| **AC-05** (Logout Session Invalidation) | `API-06`, `E2E-01` | Token invalidated on server; subsequent requests return 401 |
| **AC-06** (Authenticated Requester Identity Authority) | `API-07` | Client-supplied requester ID ignored; authenticated ID enforced |
| **AC-07** (Cross-Requester Ownership Isolation 404) | `API-08` | 404 returned on unowned ticket requests |
| **AC-08** (Public Comments Creation & Reading) | `API-09`, `E2E-02` | Append-only public comments with server author and timestamp |
| **AC-09** (Requester Problem Resolved Indication) | `API-10`, `E2E-02` | Flag set to true; ticket not formally closed |
| **AC-10** (Internal Notes Confidentiality) | `API-11`, `E2E-02` | 403 Forbidden returned to Requesters; notes not leaked |
| **AC-11** (Staff Queue Search, Filter & Pagination) | `API-12`, `API-13`, `UI-03`, `E2E-02` | Filtered queue results obey search, category, priority, status |
| **AC-12** (Staff Ticket Operational Detail) | `API-14`, `UI-04`, `E2E-02` | Operational controls and attachments accessible |
| **AC-13** (Staff Ticket Ownership Claim & Assign) | `API-15`, `UI-04`, `E2E-02` | Primary owner assigned to active IT Staff |
| **AC-14** (Permitted Status Transitions) | `API-16`, `UI-04`, `E2E-02` | Valid transitions update status badge |
| **AC-15** (Illegal Status Transitions Rejection) | `API-17` | Invalid status transition rejected with 400 Bad Request |
| **AC-16** (Internal Notes for Staff & Admin) | `API-18`, `UI-04`, `E2E-02` | Private notes visible only to Staff/Admin with distinct UI |
| **AC-17** (Admin User Directory Listing) | `API-19`, `UI-05`, `E2E-03` | User directory renders name, email, role, and status |
| **AC-18** (Admin User Creation with One Role) | `API-20`, `UI-05`, `E2E-03` | New user created with `mustChangePassword: true` |
| **AC-19** (Duplicate Email Rejection) | `API-21`, `UI-05`, `E2E-03` | 409 Conflict returned on existing email |
| **AC-20** (Admin Self-Deactivation Prevention) | `API-22`, `UI-05`, `E2E-03` | Self-deactivation blocked with 400 Bad Request |
| **AC-21** (Last Active Admin Protection) | `API-23`, `UI-05`, `E2E-03` | Deactivating sole remaining admin blocked with 400 |
| **AC-22** (Admin Reset Initial Password) | `API-24`, `UI-05`, `E2E-03` | User forced to change password upon subsequent login |
| **AC-23** (Non-Admin Forbidden Access) | `API-25`, `E2E-03` | 403 Forbidden returned on non-admin calls to user management |
| **AC-24** (Responsive Zen Green Layouts) | `UI-01..05`, `E2E-01..03` | Visual QA across Desktop, Tablet, and Mobile viewports |

---

## 4. Multi-Viewport & Responsive Checklist

- [ ] **Desktop (`>=992px`)**: All tables, multi-column forms, operational panels, and distinct notes sections render within 1200px centered layout.
- [ ] **Tablet (`768px - 991px`)**: Queue toolbars wrap gracefully; forms scale without horizontal overflow.
- [ ] **Mobile (`<768px`)**: Queue table converts into card items; login and change password fit screen; touch targets >= 44px; zero horizontal scrolling.
