# Lab 4 — AI Use and Reflection

แบบบันทึกการใช้งาน AI / Agent ในการพัฒนาโปรเจกต์ **TokTickIT** (Lab 4: Actions Taken, Dashboards, and Final Regression)

---

## AI Model & Agent Environment
- **LLM / Model Name**: Gemini 3.8 Flash
- **Agent Framework**: Antigravity AI Coding Assistant (Google DeepMind)
- **Role**: Specification & Incremental Coding Agent (Spec DD, Test DD, and TDD)

---

## Selected Key Prompts (6–10 Prompts)

| # | Purpose | Selected Key Prompt (Shortened) | Agent Action & Output | What I Reviewed / Changed |
|:---:|---|---|---|---|
| 1 | Engineering Contract & Test Blueprint | "This is Lab 4. Can you plan the phase to be a markdown file for me that have a template for report and the topic of kanban project" | วิเคราะห์ข้อกำหนด Lab Sheet 4 และสร้างสเปกครบ 6 ไฟล์ใน `docs/lab-04/`: `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, `reviewer.md`, `ai-use.md` พร้อมทั้งสร้างเทมเพลตรายงาน `lab-04-submission-template.md` ครอบคลุม 17 FRs, 16 BRs, 12 ACs, Actions Taken data model, Ticket resolution state machine, Dashboard aggregation metrics และ Test Traceability matrix | ตรวจสอบความถูกต้องของขอบเขต Lab 4 โดยเฉพาะการแยกสิทธิ์ Actions Taken (Requester อ่านอย่างเดียว, Staff บันทึกได้), Business Rules เรื่อง Resolution Gate (Requester ระบุ resolved เป็นเพียง advisory โดยสถานะไม่เปลี่ยนอัตโนมัติ), และการตรวจสอบ Concurrency (409 Conflict) |
| 2 | Actions Taken Data Migration & Seed | "ทำเลย (Work Item 2: Actions Taken Data Foundation & Seed Increment)" | อัปเดต Prisma Schema เพิ่มโมเดล ActionTaken และ relation บน User และ Ticket; สร้าง migration 'add_action_taken_model' พร้อม foreign keys (ticketId cascade, performedById restrict) และ indexes; ปรับปรุง seed.ts เพิ่มข้อมูล Actions Taken จำลองทั้งแบบหลายรายการต่อตั๋ว (ทำโดยเจ้าหน้าที่ต่างคนตาม BR-02), รายการเดียว และศูนย์รายการ; รัน seed แบบ idempotent ผ่าน 100% และ regression tests ผ่านครบ 124 server + 74 client tests | ตรวจสอบว่าข้อมูลเดิมไม่สูญหาย, ตรวจสอบ foreign key constraints ระหว่าง ActionTaken กับ Ticket และ User, ตรวจสอบเงื่อนไข followUpNote เมื่อ isFollowUpRequired เป็นจริง, และยืนยันความถูกต้องของ seed script ที่สามารถรันซ้ำได้ปลอดภัย (idempotent) |
| 3 | Actions Taken & Ticket Workflow REST APIs | "ทำActions Taken & Ticket Workflow REST APIs[#63] ต่อเลยใช่ไหม", "ทำเลย" | พัฒนา REST endpoints ใน `server/src/routes/tickets.ts` ได้แก่ Actions Taken CRUD (`GET`, `POST`, `PUT /api/tickets/:id/actions-taken`), Requester Advisory Resolution Indicator (`POST/PATCH /api/tickets/:id/indicate-resolved`), และ State Machine Status Transitions พร้อม Optimistic Concurrency Control (`PATCH /api/tickets/:id/status` คืน 409 Conflict); เขียน automated test suites ครบ 10 ข้อใน `tests/lab-04/actions-taken.api.test.ts` (API-01 ถึง API-06) และ `tests/lab-04/ticket-workflow.api.test.ts` (API-07 ถึง API-10); รันผ่านครบ 134 server tests และ 74 client tests (0 regressions) | ตรวจสอบการบังคับใช้ RBAC ป้องกัน Requester บันทึก Action (403) และ Safe Isolation ในการอ่าน (404 สำหรับตั๋วคนอื่น), ตรวจสอบเงื่อนไข validation `followUpNote` เมื่อ `isFollowUpRequired === true`, ปรับปรุง seed user email ใน integration test ให้ตรงกับฐานข้อมูลจริง (`david.lee@toktickit.local`), และตรวจสอบกลไก Concurrency Guard ที่เปรียบเทียบ `clientUpdatedAt` กับ server timestamp อย่างถูกต้อง |
| 4 | Dashboard REST APIs | *[Planned]* | *[To be updated]* | *[To be updated]* |
| 5 | Actions Taken UI on Ticket Detail | *[Planned]* | *[To be updated]* | *[To be updated]* |
| 6 | Ticket Workflow & Resolution Controls | *[Planned]* | *[To be updated]* | *[To be updated]* |
| 7 | Role Dashboards UI | *[Planned]* | *[To be updated]* | *[To be updated]* |
| 8 | Responsive Polish & Accessibility QA | *[Planned]* | *[To be updated]* | *[To be updated]* |
| 9 | Playwright E2E Suites & Traceability | *[Planned]* | *[To be updated]* | *[To be updated]* |
| 10 | Release Integration & Evidence Pack | *[Planned]* | *[To be updated]* | *[To be updated]* |

---

## My Reflection (บทสะท้อนความคิด)

การเริ่มต้น Sprint 4 ด้วยแนวคิด **Specification-Driven Development (Spec DD)** และ **Test-Driven Development (Test DD)** ร่วมกับ AI Coding Agent ทำให้กระบวนการวางแผนและกำหนดขอบเขตของระบบมีความรัดกุมอย่างยิ่ง โดยเฉพาะประเด็นทางวิศวกรรมซอฟต์แวร์ที่ซับซ้อน:

1. **การควบคุมความถูกต้องของ Business Rules และ Authorization Boundaries**:  
   เมื่อทำงานร่วมกับ AI สิ่งสำคัญที่สุดคือการตรวจสอบว่า AI ไม่ตั้งสมมติฐานที่ขัดต่อสเปก เช่น ใน Lab 4 นี้ Requester สามารถกดระบุว่าปัญหาได้รับการแก้ไขแล้ว ("Problem Appears Resolved") แต่ระบบจะต้องไม่เปลี่ยนสถานะตั๋วเป็น `RESOLVED` โดยอัตโนมัติ (เป็นเพียง Advisory Signal) เจ้าหน้าที่ไอทีจะต้องเข้ามาตรวจสอบรายละเอียดงานใน Actions Taken และเป็นผู้เปลี่ยนสถานะอย่างเป็นทางการ ซึ่งต้องบังคับใช้กฎนี้ที่ระดับ Backend API อย่างเข้มงวด

2. **การจัดการ Concurrency และ Data Integrity**:  
   การเพิ่มโมเดล `ActionTaken` แยกออกมาเป็น Normalized Entity ภายใต้ Ticket ช่วยรักษาประวัติการทำงานของทีมงานไอทีได้อย่างละเอียดและโปร่งใส โดยมีการตรวจสอบ `updatedAt` เพื่อป้องกันปัญหา Stale Updates (คืนสถานะ `409 Conflict`) ในกรณีที่มีเจ้าหน้าที่หลายคนกำลังปรับปรุงสถานะตั๋วใบเดียวกันพร้อมกัน

3. **การทำงานร่วมกับคู่ตรวจ (Peer Review) ผ่าน GitHub Workflow**:  
   การแบ่งหน้าที่ตรวจสอบ Pull Request ข้ามกันระหว่าง `@thanapornboont-star` (PR #71) และ `@jiraphat-j` (PR #66) ทำให้ได้ทบทวน Requirement ร่วมกันก่อนเริ่มเขียนโค้ดจริง และการบันทึกบทสนทนาการรีวิวแบบ Verbatim 100% ตามข้อกำหนดของวิชา ช่วยสร้างความโปร่งใสและตรวจสอบย้อนกลับได้ (Traceability) ในระดับวิศวกรรมซอฟต์แวร์ระดับอาชีพ
