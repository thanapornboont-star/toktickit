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
| #31 | `feature/23-my-tickets` | `lab2-staging` | Closes #23 | Approved | @jiraphat-j |
| #32 | `feature/24-ticket-detail-ui` | `lab2-staging` | Closes #24 | Approved | @jiraphat-j |
| #33 | `feature/25-lab2-e2e-qa` | `lab2-staging` | Closes #25 | Approved | @jiraphat-j |
| | `lab2-staging` | `main` | Release Lab 2 | | @jiraphat-j |

---

## Detailed PR Review Comments & Responses

### PR #21 (for Issue #11: Engineering Contract and Test Plan)
- **Reviewer Comment (@jiraphat-j):**
  > "ดีแล้วครับแต่อย่าลืมในส่วนของ ai_use.md, reviewer.md ด้วยนะครับ ถ้าเสร็จแล้วบอกครับ เดี๋ยวผมจะทำการ approveและ merge ให้"
- **My Response (@thanapornboont-star):**
  > "เพิ่มไฟล์ docs/lab-02/ai-use.md และ docs/lab-02/reviewer.md ใน commit ล่าสุดเรียบร้อยแล้ว รบกวนตรวจทานและ Approve / Merge ได้เลยค่ะ"

### PR #26 (for Issue #12: Development Requester schema, seed, and context API)
- **Reviewer Comment (@jiraphat-j):**
  > "ตรวจ final diff แล้วครับ จุด implementation หลักโอเคแล้ว เหลือ docs/lab-02/tests.md ที่ API-03 มีรายการซ้ำกัน รบกวนเช็ก/จัดให้ test ID ไม่ซ้ำกันครับ แล้วผมจะ review ต่อครับ"
- **My Response (@thanapornboont-star):**
  > "แก้ไขจัดเรียง Test ID ใน docs/lab-02/tests.md ใหม่ตั้งแต่ API-01 ถึง API-12 ไม่ให้มีรายการซ้ำกัน และอัปเดต Traceability Matrix ให้สอดคล้องกันเรียบร้อยแล้วใน commit ล่าสุดแล้วค่ะ ช่วยเช็คอีกทีนะคะ"

### PR #27 (for Issue #13: Ticket schema, ticket number, and Create Ticket API)
- **Reviewer Comment (@jiraphat-j):**
  > "ตรวจ final code แล้วครับ เหลือจุดเดียวที่อยากให้เช็ก: requestedPriority ใน schema มี default เป็น MEDIUM แต่ API ตอนนี้บังคับให้ client ต้องส่งค่า ถ้า requirement ต้องการใช้ default ควรปรับ validation ให้ไม่บังคับ field นี้ครับ นอกนั้นโดยรวมโอเคครับ"
- **My Response (@thanapornboont-star):**
  > "แก้ไข validation ใน server/src/routes/tickets.ts ให้ requestedPriority เป็น optional โดยมีค่าเริ่มต้น (default) เป็น MEDIUM ตาม schema และเพิ่ม automated test รองรับเรียบร้อยแล้วใน commit ล่าสุด ขอบคุณสำหรับคำแนะนำคับ"

### PR #28 (for Issue #14: Attachment upload, download, and soft removal API)
- **Reviewer Comment (@jiraphat-j):**
  > "ตรวจโค้ด Attachment APIs และ Test suite โดยรวมทำได้ดีและถูกต้องตาม spec มากครับ:Storage & Validation:มีการจัดเก็บไฟล์ด้วย UUID (Opaque filename) ในโฟลเดอร์ uploads และจำกัดขนาดไม่เกิน 5 MB (413) รวมถึงกรองประเภทไฟล์ (415) ได้ถูกต้อง Soft-removal & Slot Freeing:การทำ soft-removal มีการเก็บเหตุผล (reason), timestamp และปลดล็อคโควตา active attachment (AC-15) พร้อมทั้ง block การ download ด้วย 404 ได้ถูกต้องตาม BR-22 Ownership Isolation: มีการตรวจ ownership อย่างรัดกุม คืนค่า 404 สำหรับ unowned ticket/attachment"
- **My Response (@thanapornboont-star):**
  > "ขอบคุณค่า"

### PR #29 (for Issue #15: Zen Green shell and Development Requester selector UI)
- **Reviewer Comment (@jiraphat-j):**
  > "ตรวจเช็ค PR #29 เรียบร้อยแล้วครับ ภาพรวมการทำงานของฟีเจอร์ Requester Selector และ App Shell ทำงานได้ถูกต้อง ครอบคลุมทั้ง Loading state, Error + Retry, Session persistence และ Revalidation ตามเงื่อนไขของ Lab 2 แล้วครับ"
- **My Response (@thanapornboont-star):**
  > "ขอบคุณค่ะ"

### PR #30 (for Issue #16 : Create Ticket UI and validation)
- **Reviewer Comment (@jiraphat-j):**
  > "ตรวจเช็ค PR #30 เรียบร้อยครับรอบนี้โค้ดจัด Format ได้สะอาดมาก การทำ Form Validation, Real-time Character Counter, การเก็บค่าฟอร์มเดิมไว้เวลามี Error, และ Busy State ทำออกมาได้สมบูรณ์และถูกต้องตาม Spec ทุกจุดเลยครับ มีเพียงข้อปรับปรุงเล็กน้อยเกี่ยวกับ CSS และเอกสารที่อยากรบกวนให้ช่วย Commit เพิ่มเติมก่อน Approve & Merge ครับ: CSS Classes ที่ขาดหายใน client/src/App.css ใน CreateTicket.tsx มีการเรียกใช้ .zen-card, .zen-field-readonly, .text-primary-green, .success-header, .success-icon แต่ใน App.css ยังไม่มีการประกาศคลาสเหล่านี้ ทำให้กล่องการ์ดและสีพื้นหลังของช่อง Read-only อาจยังไม่แสดงผลครับ"
- **My Response (@thanapornboont-star):**
  > "เพิ่ม CSS Classes ที่เกี่ยวข้องทั้งหมด (.zen-card, .zen-field-readonly, .text-primary-green, .success-header, .success-icon, .success-card, .ticket-confirmation-details) ใน client/src/App.css เรียบร้อยแล้วใน commit ล่าสุด ขอบคุณมากค่ะ"

### PR #31 (for Issue #23: My Tickets API and UI)
- **Reviewer Comment (@jiraphat-j):**
  > "ตรวจ PR ให้แล้วนะ โค้ดส่วนใหญ่ทำมาโอเคเลย ทั้ง backend API ที่ทำพวก search, filter, pagination แล้วก็หน้า UI MyTickets ทำงานได้ครบตามสเปก เทสต์ที่เขียนก็ครอบคลุมดี มีจุดตกหล่นเรื่องเอกสารกับสไตล์นิดหน่อย อยากให้ช่วยแก้ก่อน merge: ใน docs/lab-02/tests.md เห็นมีเทสต์ API-06 กับ API-07 ที่รันผ่านใน my-tickets.api.test.ts แล้ว แต่ในตารางสถานะยังเป็น Planned อยู่ รบกวนแก้เป็น Pass ให้หน่อย เดี๋ยวคะแนน traceability จะหาย ใน docs/lab-02/reviewer.md ตรงตารางแถว PR #31 ช่อง status ยังเว้นว่างอยู่ ฝากเติมเป็น Pending review ด้วย ใน MyTickets.tsx ปุ่ม View ตอนนี้ใช้ btn-outline-primary มันจะขึ้นเป็นสีฟ้าของ bootstrap แนะนำเปลี่ยนเป็น btn-outline-success หรือ btn-outline-secondary จะได้เข้ากับโทนสีเขียว Zen Green ถ้าแก้ commit แล้วบอกนะ เดี๋ยวเข้ามา approve และกด merge เข้า lab2-staging ให้"
- **My Response (@thanapornboont-star):**
  > "แก้ไขเรียบร้อยแล้วค่ะ"

### PR #32 (for Issue #24: Ticket Detail and Attachment UI)
- **Reviewer Comment (@jiraphat-j):**
  > "ตรวจโค้ด PR #32 เรียบร้อยแล้วครับ ตัวฟังก์ชันทำได้ครบถ้วนมาก ทั้งการเช็ค ownership 404, การแยกตาราง active/removed attachment, การจำกัด 5 ไฟล์ และ modal บังคับกรอกเหตุผลลบ 5 ตัวอักษรขึ้นไป เทสต์ใน tests.md ก็อัปเดตครบถ้วนครับ"
- **My Response (@thanapornboont-star):**
  > "ขอบคุณค่ะ"

### PR #33 (for Issue #25: E2E, Visual QA, Documentation, and Release Readiness)
- **Reviewer Comment (@jiraphat-j):**
  > "ตรวจ PR #33 เรียบร้อยแล้วครับ ละเอียดและสมบูรณ์มาก ทั้งการเขียน E2E flow ครบวงจร, การเก็บ screenshot หลักฐานครบ 3 viewports รวมถึงการแก้จุด overflow บน mobile ใน TicketDetail ให้แสดงผลเป็น card layout เรียบร้อยดีครับ"
- **My Response (@thanapornboont-star):**
  > "ขอบคุณมากค่าาาา"

---

## Pull Requests I Reviewed for My Partner

- **Partner's PR Link:** [PR on Partner's Repository]
- **My Review Comment:**
  > "จากที่ดูค่อนข้างครบถ้วนค่ะ"
  > "ตรวจแล้วค่ะ โครงสร้าง schema, migration, seed และ API โดยรวมครบถ้วน และ seed ใช้ upsert ทำให้รันซ้ำได้โดยไม่เกิดข้อมูลซ้ำ LGTM"
  > "ตรวจแล้วค่ะ โดยรวม schema, validation, ticket number, requester binding และ idempotency ทำได้ครบ แนะนำเพิ่ม test กรณี concurrent requests ที่ใช้ Idempotency-Key เดียวกัน เพื่อยืนยันว่าไม่เกิด ticket ซ้ำค่า"
  > "โดยรวม Attachment model, upload/download, soft removal, file size/type validation, จำกัด 5 active attachments และ ownership isolation ทำได้ครบค่ะ"
  > "ตรวจ PR แล้วครับ โดยรวม Create Ticket UI, form validation, loading/busy state และ error handling ทำได้ครบและสอดคล้องกับ spec ค่ะ มีการเชื่อมต่อ API และส่ง requester/idempotency headers ได้ถูกต้อง รวมถึงรองรับ attachment validation ด้วยค่ะ"
  > "ถูกต้องครบถ้วนค่ะ คาดว่าตอนนี้ยังไม่มีปัญหาค่ะ"
  > "ครบค่ะ ขอApproveให้เลยนะคะ"
  > "ตรวจ PR แล้วครับ โดยรวม Playwright E2E, responsive/accessibility tests และ visual QA ทำได้ครบดี มีการครอบคลุม requester flow ตั้งแต่ Create Ticket → My Tickets → Ticket Detail รวมถึง Desktop/Tablet/Mobile และ keyboard navigation และมีการอัปเดต tests.md พร้อมผล 86/86 tests ผ่านค่ะ"
- **Partner's Response:**
  > "เพิ่ม test สำหรับกรณี concurrent requests ที่ใช้ Idempotency-Key เดียวกันพร้อมกันเรียบร้อยแล้วใน commit 10da627 และเพิ่ม error handling ป้องกัน race condition เพื่อยืนยันว่าจะได้ Ticket เดิมและไม่เกิด ticket ซ้ำอย่างแน่นอนครับ ขอบคุณสำหรับคำแนะนำครับ รบกวนตรวจทานและ Approve / Merge ได้เลยครับ"
  > "ขอบคุณครับ"
  > "ค้าบขอบคุณครับ"
  > "ขอบคุณมากครับ"
