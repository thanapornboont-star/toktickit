# Lab 3 — Peer Review Record

**Author:** นางสาวธนภรณ์ บุณฑริกมาศ — 67070507204 — GitHub: [@thanapornboont-star](https://github.com/thanapornboont-star)  
**Peer Reviewer:** นายจิรภัทร เจริญพิพัฒธาดา — 67070507217 — GitHub: [@jiraphat-j](https://github.com/jiraphat-j)

---

## Pull Requests I Authored (Reviewed & Merged by Peer Reviewer)

| PR | Feature Branch | Target Branch | Linked Issue | Reviewer Verdict | Merged By |
|:---:|---|---|---|:---:|:---:|
| #50 | `sprint3/contract-and-test-blueprint` | `lab3-staging` | Closes #40 | Approved | @jiraphat-j |
| #51 | `sprint3/user-model-migration` | `lab3-staging` | Work Item 2 | Approved | @jiraphat-j |
| #52 | `sprint3/auth-account-entry` | `lab3-staging` | Work Item 3 | Approved | @jiraphat-j |
| #53 | `sprint3/rbac-requester-continuity` | `lab3-staging` | Closes #43 | Approved | @jiraphat-j |
| #54 | `sprint3/staff-queue` | `lab3-staging` | Closes #44 | Approved | @jiraphat-j |
| #55 | `sprint3/staff-ticket-operations` | `lab3-staging` | Work Item 6 | Pending Review | |
| | `sprint3/admin-users` | `lab3-staging` | Work Item 7 | | |
| | `sprint3/responsive-visual-qa` | `lab3-staging` | Work Item 8 | | |
| | `sprint3/e2e-traceability` | `lab3-staging` | Work Item 9 | | |
| | `sprint3/evidence-and-release-docs` | `lab3-staging` | Work Item 10 | | |
| | `lab3-staging` | `main` | Release Lab 3 | | |

---

## Detailed PR Review Comments & Responses

### PR #50 (for Issue #40: Sprint 3 Contract, Acceptance Criteria, and Test Blueprint)
- **Feature Branch**: `sprint3/contract-and-test-blueprint`
- **Target Branch**: `lab3-staging`
- **Reviewer Comment (@jiraphat-j)**:
  > "ตรวจ PR #50 เรียบร้อยครับ เป็นการวางโครง Contract และ Test Blueprint ของ Lab 3 ที่ละเอียดและครอบคลุมมาก ทั้งการแยก Scope 3 บทบาท, Business Rules และ State Machine ของตั๋ว รวมถึง Schema และ Test Matrix ที่เตรียมไว้"
- **My Response (@thanapornboont-star)**:
  > "ขอบคุณค่ะ"

### PR #51 (for Work Item 2: Identity data migration and development seed)
- **Feature Branch**: `sprint3/user-model-migration`
- **Target Branch**: `lab3-staging`
- **Reviewer Comment (@jiraphat-j)**:
  > "ตรวจ PR #51 แล้วครับ โครงสร้าง User model และ Session ทำได้ครบถ้วน การ migration มีการ backup/copy ข้อมูลเดิมของ DevRequester ไปยัง User ได้โดยไม่มีข้อมูลตั๋วเดิมสูญหาย (251 ใบยังคงอยู่ครบ) seed รันซ้ำได้ปลอดภัยและครอบคลุมทุก role ครับ Approved"
- **My Response (@thanapornboont-star)**:
  > "ขอบคุณค่ะ"

### PR #52 (for Work Item 3: Authentication and account-entry flow)
- **Feature Branch**: `sprint3/auth-account-entry`
- **Target Branch**: `lab3-staging`
- **Reviewer Comment (@jiraphat-j)**:
  > "ตรวจ PR #52 เรียบร้อยครับ ตัวระบบ Auth ทั้ง login, logout, first password change ทำได้สมบูรณ์ตาม spec มีการป้องกัน user enumeration และ safe errors ชัดเจน Component tests และ API tests ผ่านครบถ้วน Approved ครับ"
- **My Response (@thanapornboont-star)**:
  > "ขอบคุณค่ะ"

### PR #53 (for Work Item 4: Authorization boundary, RBAC enforcement, and requester continuity)
- **Feature Branch**: `sprint3/rbac-requester-continuity`
- **Target Branch**: `lab3-staging`
- **Reviewer Comment (@jiraphat-j)**:
  > "ตรวจ PR #53 เรียบร้อยครับ การบังคับ RBAC แบ่งสิทธิ์ 3 role ทำได้ถูกต้อง มีการป้องกัน cross-user access คืน 404 ปลอดภัย และยังมี fallback header สำหรับ Lab 2 compat ครบถ้วน Component tests และ API tests ผ่าน 100% Approved ครับ"
- **My Response (@thanapornboont-star)**:
  > "ขอบคุณค่ะ"

### PR #54 (for Issue #44: Build role-protected IT Staff work queue)
- **Feature Branch**: `sprint3/staff-queue`
- **Target Branch**: `lab3-staging`
- **Reviewer Comment (@jiraphat-j)**:
  > "ตรวจโค้ด PR #54 เรียบร้อยครับ ตัวฟังก์ชันคิวตั๋ว IT Staff ทำได้ดีมาก ทั้งการค้นหา กรองสถานะ/IT Priority/ผู้รับผิดชอบ, การแบ่งหน้า และการแสดงผล responsive สลับตารางกับ mobile card เทสต์ผ่านครบถ้วนทั้ง Server (71/71) และ Client (50/50)"
- **My Response (@thanapornboont-star)**:
  > "ขอบคุณค่ะ"

### PR #55 (for Work Item 6: Implement Staff Ticket Detail workflow and communications)
- **Feature Branch**: `sprint3/staff-ticket-operations`
- **Target Branch**: `lab3-staging`
- **Reviewer Comment (@jiraphat-j)**:
  > *Pending review*
- **My Response (@thanapornboont-star)**:
  > *Pending*

---

## Pull Requests I Reviewed for My Partner (@jiraphat-j)

| PR | Partner Branch | Target Branch | Linked Issue | Reviewer Verdict | Merged By |
|:---:|---|---|---|:---:|:---:|
| #43 | `lab3/01-engineering-contract` | `lab3-staging` | Closes #32 | Approved | @thanapornboont-star |
| #44 | `feature/33-test-plan` | `lab3-staging` | Closes #33 | Approved | @thanapornboont-star |
| #45 | `feature/34-user-migration-seed` | `lab3-staging` | Closes #34 | Approved | @thanapornboont-star |
| #46 | `feature/35-auth-session-screens` | `lab3-staging` | Closes #35 | Approved | @thanapornboont-star |

### PR #43 (for Issue #32: Sprint 3 engineering contract and specification)
- **Partner's PR Link**: [PR #43](https://github.com/jiraphat-j/toktickit/pull/43)
- **Feature Branch**: `lab3/01-engineering-contract`
- **Target Branch**: `lab3-staging`
- **My Review Comment (@thanapornboont-star)**:
  > "โดยรวม Engineering Specification, API Contract, UI Specification, RBAC, Status Transition Matrix และ Acceptance Criteria ครอบคลุม requirement ของ Lab 3 ได้ดีค่ะ และauthentication/session, requester isolation, Internal Notes protection และ admin safeguards ระบุไว้ชัดเจนและสอดคล้องกันทั้งหมดค่ะ"
- **Partner's Response (@jiraphat-j)**:
  > "ได้ครับ ขอบคุณครับ"

### PR #44 (for Issue #33: Test DD and acceptance traceability plan)
- **Partner's PR Link**: [PR #44](https://github.com/jiraphat-j/toktickit/pull/44)
- **Feature Branch**: `feature/33-test-plan`
- **Target Branch**: `lab3-staging`
- **My Review Comment (@thanapornboont-star)**:
  > "โดยรวม tests.md ทำได้ละเอียดดี โดยเฉพาะ Test ID และ Traceability Matrix ที่ครอบคลุม AC-01 ถึง AC-22 ครบ และมีทั้ง API, Security/RBAC, UI, Regression และ E2E tests มี 2 จุดที่อยากให้แก้ก่อน Approve:  
  > 1. ใน docs/lab-03/reviewer.md ส่วน Detailed PR Review Logs ของ Issue #33 ยังใช้ [Link to PR on lab3-staging] อยู่ รบกวนเปลี่ยนเป็นลิงก์ PR #44 เพื่อให้ traceability ของ reviewer record ครบถ้วน  
  > 2. AC-04 ระบุว่าหลัง Logout ต้องป้องกัน browser back-navigation แต่ใน Test Plan ยังไม่มี test scenario ที่ระบุการกด Back โดยตรงครับ รบกวนเพิ่ม E2E test สำหรับ Logout → Browser Back → ต้องไม่สามารถกลับเข้า protected screen หรือเห็นข้อมูล session เดิมได้  
  > หลังแก้ 2 จุดนี้แล้วฝากส่งมาให้ re-review อีกครั้งครับ"
- **Partner's Response (@jiraphat-j)**:
  > "แก้ไขตามคำแนะนำทั้ง 2 จุดเรียบร้อยแล้วใน commit ff014d8 ครับ:  
  > 1. อัปเดต PR Link ใน docs/lab-03/reviewer.md: เปลี่ยนเป็นลิงก์ PR #44 ครบถ้วนทั้งใน Summary Table และ Detailed Review Logs  
  > 2. เพิ่ม E2E Test Scenario สำหรับ Browser Back-Navigation หลัง Logout (E2E-01b): เพิ่มรายการเคสทดสอบ E2E-01b ใน docs/lab-03/tests.md ระบุชัดเจนว่าหลังกด Logout เมื่อผู้ใช้กดปุ่ม Browser Back (page.goBack()) ระบบต้อง redirect กลับมาที่หน้า /login ทันที และไม่อนุญาตให้เปิดดูหน้า protected หรือข้อมูล session เดิมได้ แมปลงใน Acceptance Criteria Traceability Matrix ใต้ข้อ AC-04 เรียบร้อยแล้วครับ  
  > รบกวนตรวจทานและ Approve / Merge ได้เลยครับ ขอบคุณครับ!"
- **My Follow-up & Approval (@thanapornboont-star)**:
  > "เรียบร้อยแล้วค่ะ ขออนุญาตapprove ให้นะคะ"

### PR #45 (for Issue #34: User data model, requester migration, and seed data)
- **Partner's PR Link**: [PR #45](https://github.com/jiraphat-j/toktickit/pull/45)
- **Feature Branch**: `feature/34-user-migration-seed`
- **Target Branch**: `lab3-staging`
- **My Review Comment (@thanapornboont-star)**:
  > "โดยรวม User Model, Role, migration, seed และ migration-seed tests วางโครงสร้างได้ดี โดยเฉพาะการใช้ bcrypt, idempotent upsert และการเพิ่ม Ticket/User relations"
- **Partner's Response (@jiraphat-j)**:
  > "ขอบคุณมากครับ หากเรียบร้อยแล้วกด merge ได้เลยครับ"

### PR #46 (for Issue #35: Authentication, password lifecycle, and session management)
- **Partner's PR Link**: [PR #46](https://github.com/jiraphat-j/toktickit/pull/46)
- **Feature Branch**: `feature/35-auth-session-screens`
- **Target Branch**: `lab3-staging`
- **My Review Comment (@thanapornboont-star)**:
  > "Auth API, password lifecycle, session cookie และ test coverage ออกมาดีค่ะ แต่มี blocker ที่ควรแก้ก่อน Approve:  
  > 1. handleLoginSuccess() ตอนนี้ set แค่ currentUser แต่ render flow ยังเช็ก !currentRequester ก่อน currentUser ทำให้หลัง login สำเร็จมีโอกาสไม่เข้า authenticated shell และกลับไป Development Requester Selector แทน ซึ่งจุดนี้กระทบ AC-02/AC-05 โดยตรง  
  > 2. revalidateSession() ยังผูกกับ getStoredRequesterId() อยู่ ถ้าไม่มี stored requester ID function จะ return ก่อนเรียก /api/auth/me ทำให้ authenticated session ที่มีอยู่ไม่ถูก restore หลัง reload ได้ ควรให้ session cookie/server identity เป็น source of truth ตาม Lab 3 specification  
  > 3. PR นี้ยังมี fetchActiveDevRequesters(), currentRequester, RequesterSelector และ X-Dev-Requester-Id flow อยู่ ขณะที่ BR-24 ระบุว่า Development Requester selector และ header ต้องถูก retire และแทนด้วย authenticated session ครับ ถ้าตั้งใจคง compatibility ชั่วคราว รบกวนแยก/ระบุ scope ให้ชัดเจนด้วยนะคะ  
  > 4. Test AUTH-07 ระบุว่าจะตรวจ expired session แต่ implementation ตอนนี้ตรวจเพียง unauthenticated กับ valid session ยังไม่มี case ที่ session หมดอายุจริงค่ะ  
  > รบกวนแก้ flow authentication/session ตรงนี้และเพิ่ม test ให้ครบและรีพลายว่าแก้แล้วนนะคะ"
- **Partner's Response (@jiraphat-j)**:
  > "แก้ไขเรียบร้อยครบถ้วนทั้ง 4 จุดตามคำแนะนำแล้วครับ:  
  > 1. Render Flow Priority: ปรับปรุงใน client/src/App.tsx ให้ currentUser อยู่ใน Priority สูงสุด เมื่อ handleLoginSuccess() ทำงาน จะเข้าสู่ Authenticated App Shell ทันที 100% โดยไม่ติดเงื่อนไข !currentRequester อีกต่อไป (ตรงตาม AC-02, AC-05)  
  > 2. Session Source of Truth: ปรับ revalidateSession() ให้ตรวจสอบ Session Cookie และเรียก /api/auth/me เพื่อกู้คืนสถานะเซสชันโดยไม่ขึ้นกับ getStoredRequesterId() อีกต่อไป  
  > 3. Isolate Legacy Dev Selector Scope: แยก Scope ของ Development Requester Selector ใน App.tsx ออกอย่างชัดเจน โดยตั้งค่าหน้า Login (<Login />) เป็นหน้าเริ่มต้นหลัก 100% สำหรับผู้ใช้ที่ยังไม่ล็อกอิน และระบุคอมเมนต์ไว้อย่างโปร่งใสว่าเป็นบริดจ์ชั่วคราวสำหรับรองรับชุดเทสต์ Lab 2 ซึ่งจะถูก retire ถาวรใน Step 5 (Issue #36) ตามกฎ BR-24  
  > 4. Expired Session & UI Test Coverage: เพิ่มฟังก์ชัน expireAllSessions() / expireSession(token) ใน server/src/session.ts, อัปเดตเทสต์ AUTH-07 ใน server/tests/lab-03/auth.api.test.ts ให้ครอบคลุมเคสเซสชันหมดอายุจริง ส่งคุกกี้มาแล้วได้ 401 Unauthorized และตัด session ออกจาก store, และเพิ่ม integration test ใหม่ client/tests/lab-03/App.auth.test.tsx (3 tests) ครอบคลุมการแสดงหน้า Login เริ่มต้น, การเข้าสู่ Authenticated Shell ทันทีหลังล็อกอิน และการบล็อกด้วยหน้า Change Password  
  > เทสต์ทั้งหมดผ่านครบ 100% (104/104 tests) รบกวนช่วย Re-review และ Approve ให้อีกครั้งนะครับ ขอบคุณมากครับ!"
- **My Follow-up & Approval (@thanapornboont-star)**:
  > "โอเคค่ะ approve ให้เรียบร้อยแล้วนะคะ"

