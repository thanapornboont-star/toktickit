# Lab 2 — AI Use and Reflection

แบบบันทึกการใช้งาน AI / Agent ในการพัฒนาโปรเจกต์ **TokTickIT** (Lab 2 Requester Ticketing MVP)

---

## AI Model & Agent Environment
- **LLM / Model Name**: Gemini 3.7 Flash (High Reasoning) — Prompts 1–10 below
- **Agent Framework**: Antigravity AI Coding Assistant (Google DeepMind) — Prompts 1–10 below
- **LLM / Model Name (Prompt 11)**: Claude Sonnet 5
- **Agent Framework (Prompt 11)**: Claude Code (Anthropic)
- **Role**: Pair Programming Assistant & Incremental Spec/Test/Code Implementer

---

## Selected Key Prompts (6–10 Prompts)

| # | Purpose | Selected Key Prompt (Shortened) | Agent Action & Output | What I Reviewed / Changed |
|:---:|---|---|---|---|
| 1 | Engineering Contract | "สร้าง Engineering Contract สำหรับ Lab 2 ให้ครบทั้ง 4 ไฟล์ specification.md, api-spec.md, ui-spec.md, tests.md" | วิเคราะห์ข้อกำหนด Lab Sheet สร้างสเปก FR-01..12, BR-01..14, AC-01..12, REST API schemas, Zen Green tokens, และ Test Plan | ตรวจสอบความถูกต้องของ BR และ AC ให้อยู่ในขอบเขต Requester MVP โดยไม่มี IT Staff workflow หรือ authentication |
| 2 | Peer Review Documents | "เพิ่มไฟล์ ai-use.md และ reviewer.md ใน docs/lab-02/ สำหรับบันทึกประวัติการพัฒนาและ Peer Review" | สร้างเทมเพลตและบันทึกประวัติ Prompt และตาราง PR Review สำหรับ Lab 2 | ตรวจสอบข้อมูล Author, Peer Reviewer (@jiraphat-j) และเกณฑ์การประเมิน Part 4 |
| 3 | Dev Requester & Seed | "สร้าง DevRequester model, idempotent seed script และ Context API พร้อม middleware ตรวจ X-Dev-Requester-Id" | เพิ่ม Schema, Migration, Seed (4 categories, 7 systems, 4 active requesters, 1 inactive) และ Reference API | ทดสอบรัน seed ซ้ำ 2 รอบเพื่อยืนยัน idempotency และตรวจว่า inactive requester ไม่โผล่ใน selector |
| 4 | Ticket Creation API | "สร้าง Ticket model, atomic unique Ticket Number generator (TKT-YYYY-XXXXXX) และ POST /api/tickets" | เขียน failing tests ก่อน implement API ให้ status เริ่มต้นเป็น NEW และป้องกันไม่ให้รับ requesterId จาก body | ตรวจสอบ Supertest ว่า Ticket Number ไม่ซ้ำและผูกกับ requester ใน header ถูกต้อง |
| 5 | Attachment API | "สร้าง Attachment model, multipart upload, download และ soft-removal with reason" | Implement middleware upload (max 5MB, JPG/PNG/WEBP/PDF), จำกัด 5 ไฟล์ active และบันทึก removal reason | ทดสอบความถูกต้องของ soft delete: ข้อมูล metadata ยังอยู่ แต่ download โดนบล็อก (404) |
| 6 | Zen Green UI & Selector | "สร้าง Zen Green App Shell และหน้า Development Requester Selector" | ออกแบบ CSS Variables ตาม Zen Green tokens, สร้าง Dropdown เลือก requester และเก็บใน sessionStorage | ตรวจสอบข้อความแจ้งเตือนว่า selector เป็น testing mechanism ไม่ใช่ authentication จริง |
| 7 | Create Ticket UI | "สร้างฟอร์ม Create Ticket พร้อม client-side validation และเชื่อมต่อ API" | สร้าง UI input fields, inline error messages ใต้ช่อง, disabled submit state ขณะ busy | ตรวจสอบว่า form values ยังคงอยู่แม้ API ตอบกลับ error และแสดง Ticket Number เมื่อสำเร็จ |
| 8 | My Tickets Screen | "สร้างหน้า My Tickets พร้อม Search, Filter, Sort, Pagination และความสามารถสลับ Requester" | สร้างตารางบน Desktop และการ์ดบน Mobile, ทำ Dynamic Query parameters และ Empty/No-results states | ทดสอบสลับ Requester A -> B แล้วยืนยันว่า Ticket ของ A หายไปทั้งหมด |
| 9 | Ticket Detail View | "สร้างหน้า Ticket Detail แสดงข้อมูลแบบ Read-only และจัดการ Attachments (Upload/Download/Soft-Delete)" | สร้าง Read-only detail layout, ตาราง Active/Removed attachments และ modal ยืนยันการลบพร้อมกรอกเหตุผล | ยืนยันว่าไม่มีปุ่ม IT staff/comment/status change และทดสอบเปิดไฟล์ของ user อื่นต้องได้ 404 |
| 10 | E2E & Visual QA | "เขียน Playwright E2E test และจับภาพ Screenshots ตามขนาด Desktop, Tablet, Mobile" | รัน Playwright automated test ตรวจสอบ end-to-end flow และถ่ายรูปบันทึกใน `artifacts/lab-02/screenshots/` | ตรวจสอบผลรันทุก test suite (100% pass) เพื่อเตรียมหลักฐานส่งใน PDF Report |
| 11 | Missing Screenshot Evidence (Claude Code) | "ช่วยหา screenshot ที่ยังขาดตาม checklist (Part 6 validation/invalid-attachment/API-failure, Part 7 empty/no-results state) แล้วทำเป็นหลักฐานใหม่" | เขียน Playwright spec ใหม่ `e2e/lab-02/additional-evidence.spec.ts` ที่บังคับ validation error, แนบไฟล์ประเภทไม่ถูกต้อง, จำลอง 500 ผ่าน route interception, และหา requester ที่มี 0 ticket จริงผ่าน API เพื่อจับภาพ empty state แยกจาก no-results state อย่างถูกต้อง | ยืนยันภาพทั้ง 5 สถานะ x 3 viewport (15 ไฟล์) ตรงตามที่ checklist ต้องการก่อนใส่ในรายงาน และตรวจ curl evidence จริงสำหรับ unauthorized ticket/attachment access (404) |

---

## Reflection (บทสะท้อนความคิด)

การพัฒนา Lab 2 โดยใช้ **Spec-Driven Development (Spec DD)** และ **Test-Driven Development (TDD)** ร่วมกับ AI Agent ช่วยให้การควบคุมขอบเขตของงานมีความชัดเจนและเป็นระบบ โดยเฉพาะการกำหนด Business Rules ที่เข้มงวด เช่น การห้ามไม่ให้มี IT Staff workflow หรือระบบ login จริงในขั้นนี้ ช่วยให้ AI โฟกัสเฉพาะส่วน Requester MVP ตามที่โจทย์กำหนด

จุดที่ต้องควบคุมและตรวจสอบ AI อย่างรอบคอบคือการรักษาความปลอดภัยของข้อมูล (Data Isolation) ซึ่งต้องสั่งกำชับให้ Backend เป็น Authority หลักในการระบุ `requesterId` จาก Header `X-Dev-Requester-Id` เสมอ และห้ามรับค่า `requesterId` หรือ `ticketNumber` จาก Client Request Body โดยตรง รวมถึงการบังคับใช้กลยุทธ์ 404 Not Found เมื่อมีการพยายามเข้าถึง Ticket ข้าม Requester เพื่อป้องกัน Information Disclosure

นอกจากนี้ การให้เพื่อน (Peer Reviewer) เข้ามาร่วมตรวจสอบ diff ในทุก Pull Request และตอบกลับทุก Comment อย่างละเอียด ทำให้ค้นพบจุดบกพร่องตั้งแต่เนิ่น ๆ และได้โค้ดที่มีคุณภาพตรงตามเกณฑ์ของวิศวกรรมซอฟต์แวร์
