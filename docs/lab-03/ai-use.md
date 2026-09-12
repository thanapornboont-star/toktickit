# Lab 3 — AI Use and Reflection

แบบบันทึกการใช้งาน AI / Agent ในการพัฒนาโปรเจกต์ **TokTickIT** (Lab 3: Users, Roles, IT Staff Ticketing, and Admin Screens)

---

## AI Model & Agent Environment
- **LLM / Model Name**: Gemini 3.8 Flash
- **Agent Framework**: Antigravity AI Coding Assistant (Google DeepMind)
- **Role**: Specification & Incremental Coding Agent (Spec DD, Test DD, and TDD)

---

## Selected Key Prompts (6–10 Prompts)

| # | Purpose | Selected Key Prompt (Shortened) | Agent Action & Output | What I Reviewed / Changed |
|:---:|---|---|---|---|
| 1 | Engineering Contract & Test Blueprint | "ช่วยทำ lab 3 ให้หน่อย lab 2 เสร็จแล้วทำต่อได้เลย... Issue 1 คือ Sprint 3 contract, acceptance criteria, and test blueprint #40" | วิเคราะห์ข้อกำหนด Lab Sheet 3 และ AI Agent Playbook สร้างสเปกครบ 6 ไฟล์: `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, `reviewer.md`, `ai-use.md` กำหนด 18 FRs, 26 BRs, 24 ACs, Data Models, Role Matrix, Status Transitions และ Planned Test Matrix | ตรวจสอบความถูกต้องของขอบเขต Lab 3 (ไม่เกินขอบเขต เช่น ไม่มี self-signup หรือ email delivery), ตรวจสอบความสอดคล้องของ Business Rules (BR-01 ถึง BR-26) และการป้องกัน Security boundaries |
| 2 | Identity Migration & Seed | "ทำต่อเลย (Work Item 2: Convert development requesters into Lab 3 users and seed roles)" | อัปเดต Prisma Schema เพิ่ม User, Role, Session, ITPriority, TicketStatus, PublicComment, InternalNote และฟิลด์บน Ticket; สร้าง Migration SQL ที่โอนย้ายข้อมูล DevRequester เดิม 251 tickets เข้า User โดยไม่มีข้อมูลสูญหาย; ปรับปรุง seed.ts ให้ครอบคลุม 11 users, 3 roles, sample tickets ทุกสถานะ และทดสอบ idempotency ผ่าน 100% | ตรวจสอบว่า existing tickets (251 ใบ) และ attachments (192 ไฟล์) ไม่สูญหาย, sequence ของ User ถูก sync อย่างถูกต้อง, และ automated tests เดิมของ Lab 1-2 ยังคงผ่านครบถ้วน (23/23 server, 21/21 client) |
| 3 | Authentication & First Password Change | "ต่อเลย (Work Item 3: Add login, current user, first-login password change, and logout)" | สร้าง Backend Auth API (`/login`, `/logout`, `/me`, `/change-password`), Password complexity validation (BR-04), Session management & token revocation (BR-06); สร้าง Frontend `Login` และ `ChangePassword` components พร้อม Busy state, Inline validation, Checklist, และ Authenticated App Shell showing user name, role badge, and logout | ตรวจสอบข้อความ Error เพื่อความปลอดภัย (Safe Failure) ไม่เปิดเผยว่าอีเมลมีอยู่ในระบบหรือไม่, ตรวจสอบว่าผู้ใช้ที่มี `mustChangePassword === true` ไม่สามารถเข้าใช้งานหน้าหลักได้ก่อนเปลี่ยนรหัสผ่าน, และรันเทสต์ผ่านครบถ้วน (Server 36/36, Client 35/35) |
| 4 | RBAC & Requester Continuity | *[Planned for Work Item 4]* | *[Pending]* | *[Pending]* |
| 5 | IT Staff Work Queue | *[Planned for Work Item 5]* | *[Pending]* | *[Pending]* |
| 6 | Staff Operations, Comments & Notes | *[Planned for Work Item 6]* | *[Pending]* | *[Pending]* |
| 7 | Administrator User Management | *[Planned for Work Item 7]* | *[Pending]* | *[Pending]* |
| 8 | Shell Navigation & Responsive Visual QA | *[Planned for Work Item 8]* | *[Pending]* | *[Pending]* |
| 9 | E2E & Full Traceability Closure | *[Planned for Work Item 9]* | *[Pending]* | *[Pending]* |
| 10 | Release Integration & Evidence Pack | *[Planned for Work Item 10]* | *[Pending]* | *[Pending]* |

---

## Reflection (บทสะท้อนความคิด)

*[ส่วนนี้สำหรับนักศึกษาเขียนสะท้อนความคิดด้วยตนเอง หลังจากการพัฒนาและทดสอบครบถ้วนตามเกณฑ์ของวิชา]*
