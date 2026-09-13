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
| #54 | `sprint3/staff-queue` | `lab3-staging` | Closes #44 | Pending Review | |
| | `sprint3/staff-ticket-operations` | `lab3-staging` | Work Item 6 | | |
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
  > *Pending review*
- **My Response (@thanapornboont-star)**:
  > *Pending*

---

## Pull Requests I Reviewed for My Partner (@jiraphat-j)

- **Partner's PR Link**: *[PR on Partner's Repository]*
- **My Review Comment**:
  > *Pending review of partner's PR.*
- **Partner's Response**:
  > *Pending partner's response.*
