# Lab 2 — Peer Review Record

**Author:** นางสาวธนภรณ์ บุณฑริกมาศ — 67070507204 — GitHub: [@thanapornboont-star](https://github.com/thanapornboont-star)  
**Peer Reviewer:** นายจิรภัทร เจริญพิพัฒธาดา — 67070507217 — GitHub: [@jiraphat-j](https://github.com/jiraphat-j)

---

## Pull Requests I Authored (Reviewed & Merged by Peer Reviewer)

| PR | Feature Branch | Target Branch | Linked Issue | Reviewer Verdict | Merged By |
|:---:|---|---|---|:---:|:---:|
| #21 | `feature/11-lab2-contract` | `lab2-staging` | Closes #11 | Approved | @jiraphat-j |
| #26 | `feature/12-dev-requester-context` | `lab2-staging` | Closes #12 | Approved | @jiraphat-j |
| #27 | `feature/13-create-ticket-api` | `lab2-staging` | Closes #13 | Approved | @jiraphat-j |
| #28 | `feature/14-attachments-api` | `lab2-staging` | Closes #14 | Approved | @jiraphat-j |
| #29 | `feature/15-requester-selector-ui` | `lab2-staging` | Closes #15 | Approved | @jiraphat-j |
| #30 | `feature/16-create-ticket-ui` | `lab2-staging` | Closes #16 | Approved | @jiraphat-j |
| | `feature/#NN-my-tickets` | `lab2-staging` | Closes #NN | | @jiraphat-j |
| | `feature/#NN-ticket-detail-ui` | `lab2-staging` | Closes #NN | | @jiraphat-j |
| | `feature/#NN-lab2-e2e-qa` | `lab2-staging` | Closes #NN | | @jiraphat-j |
| | `lab2-staging` | `main` | Release Lab 2 | | @jiraphat-j |

---

## Detailed PR Review Comments & Responses

### PR #21 (for Issue #11: Engineering Contract and Test Plan)
- **Reviewer Comment (@jiraphat-j):**
  > "ดีแล้วครับแต่อย่าลืมในส่วนของ ai_use.md, reviewer.md ด้วยนะครับ ถ้าเสร็จแล้วบอกครับ เดี๋ยวผมจะทำการ approve และ merge ให้"
- **My Response (@thanapornboont-star):**
  > "เพิ่มไฟล์ `docs/lab-02/ai-use.md` และ `docs/lab-02/reviewer.md` ใน commit ล่าสุดเรียบร้อยแล้วครับ ขอบคุณครับ รบกวนตรวจทานและ Approve / Merge ได้เลยครับ"

### PR #26 (for Issue #12: Development Requester schema, seed, and context API)
- **Reviewer Comment (@jiraphat-j):**
  > "ตรวจ final diff แล้วครับ จุด implementation หลักโอเคแล้ว เหลือ docs/lab-02/tests.md ที่ API-03 มีรายการซ้ำกัน รบกวนเช็ก/จัดให้ test ID ไม่ซ้ำกันครับ แล้วผมจะ review ต่อครับ"
- **My Response (@thanapornboont-star):**
  > "แก้ไขจัดเรียง Test ID ใน docs/lab-02/tests.md ใหม่ตั้งแต่ API-01 ถึง API-12 ไม่ให้มีรายการซ้ำกัน และอัปเดต Traceability Matrix ให้สอดคล้องกันเรียบร้อยแล้วใน commit ล่าสุดแล้วค่ะ ช่วยเช็คอีกทีนะคะ"

### PR #27 (for Issue #13: Ticket schema, ticket number, and Create Ticket API)
- **Reviewer Comment (@jiraphat-j):**
  > "ตรวจ final code แล้วครับ เหลือจุดเดียวที่อยากให้เช็ก: requestedPriority ใน schema มี default เป็น MEDIUM แต่ API ตอนนี้บังคับให้ client ต้องส่งค่า ถ้า requirement ต้องการใช้ default ควรปรับ validation ให้ไม่บังคับ field นี้ครับ นอกนั้นโดยรวมโอเคครับ"
- **My Response (@thanapornboont-star):**
  > "แก้ไข validation ใน `server/src/routes/tickets.ts` ให้ `requestedPriority` เป็น optional โดยมีค่าเริ่มต้น (default) เป็น `MEDIUM` ตาม schema และเพิ่ม automated test รองรับเรียบร้อยแล้วใน commit ล่าสุด ขอบคุณสำหรับคำแนะนำครับ รบกวนตรวจทานอีกครั้งและ Approve / Merge ได้เลยครับ"

### PR #28 (for Issue #14: Attachment upload, download, and soft removal API)
- **Reviewer Comment (@jiraphat-j):**
  > "ตรวจสอบโค้ดการจัดการ Attachment ครบถ้วนทั้ง upload จำกัด 5MB/5ไฟล์, download และ soft-delete พร้อมบันทึกเหตุผลเรียบร้อยดีครับ"
- **My Response (@thanapornboont-star):**
  > "ขอบคุณมากครับ ได้เพิ่ม automated tests ครอบคลุม API-08..API-12 ครบถ้วนแล้วครับ"

### PR #29 (for Issue #15: Zen Green shell and Development Requester selector UI)
- **Reviewer Comment (@jiraphat-j):**
  > "ตรวจสอบหน้า Selector และ Zen Green App Shell แล้ว การแสดงผลและ Responsive สวยงามตรงตามสเปกครับ"
- **My Response (@thanapornboont-star):**
  > "ขอบคุณครับ ได้ทำการ Revalidate session storage กับ API พร้อม component tests เรียบร้อยแล้วครับ"

### PR #30 (for Issue #16: Create Ticket UI and validation)
- **Reviewer Comment (@jiraphat-j):**
  > "ตรวจเช็ค PR #30 เรียบร้อยครับรอบนี้โค้ดจัด Format ได้สะอาดมาก การทำ Form Validation, Real-time Character Counter, การเก็บค่าฟอร์มเดิมไว้เวลามี Error, และ Busy State ทำออกมาได้สมบูรณ์และถูกต้องตาม Spec ทุกจุดเลยครับ มีเพียงข้อปรับปรุงเล็กน้อยเกี่ยวกับ CSS และเอกสารที่อยากรบกวนให้ช่วย Commit เพิ่มเติมก่อน Approve & Merge ครับ: CSS Classes ที่ขาดหายใน client/src/App.css ใน CreateTicket.tsx มีการเรียกใช้ .zen-card, .zen-field-readonly, .text-primary-green, .success-header, .success-icon แต่ใน App.css ยังไม่มีการประกาศคลาสเหล่านี้ ทำให้กล่องการ์ดและสีพื้นหลังของช่อง Read-only อาจยังไม่แสดงผลครับ"
- **My Response (@thanapornboont-star):**
  > "เพิ่ม CSS Classes ที่เกี่ยวข้องทั้งหมด (`.zen-card`, `.zen-field-readonly`, `.text-primary-green`, `.success-header`, `.success-icon`, `.success-card`, `.ticket-confirmation-details`) ใน `client/src/App.css` เรียบร้อยแล้วใน commit ล่าสุด ขอบคุณมากครับที่ช่วยตรวจเช็คจุดนี้ รบกวนตรวจทานอีกครั้งและ Approve / Merge ได้เลยครับ"

---

## Pull Requests I Reviewed for My Partner

- **Partner's PR Link:** [PR on Partner's Repository]
- **My Review Comment:**
  > "จากที่ดูค่อนข้างครบถ้วนค่ะ"
  > "ตรวจแล้วค่ะ โครงสร้าง schema, migration, seed และ API โดยรวมครบถ้วน และ seed ใช้ upsert ทำให้รันซ้ำได้โดยไม่เกิดข้อมูลซ้ำ LGTM"
- **Partner's Response:**
  > "ค้าบขอบคุณครับ"
