# Lab 1 — AI Use and Reflection

แบบบันทึกการใช้งาน AI / Agent ในการพัฒนาโปรเจกต์ **TokTickIT** (Lab 1)

---

## AI Model & Agent Environment
- **LLM / Model Name**: Gemini 3.6 Flash (High Reasoning)
- **Agent Framework**: Antigravity AI Coding Assistant (Google DeepMind)
- **Role**: Pair Programming Assistant & Incremental Development Enforcer

---

## Selected Key Prompts (6–10 Prompts)

| # | Prompt (Summarised / Actual Prompt) | Agent Action & Output | What I Did with the Result / Verification |
|---|---|---|---|
| 1 | "ช่วยทำ CPE 334 Lab 1: TokTickIT โดยยึด lab1_checklist.md, evidence_checklist.md และ PROJECT_STRUCTURE.md เป็น Source of Truth ตอนนี้อยู่ที่ Issue 1" | วิเคราะห์ความต้องการ ตรวจสอบสถานะ git branch (`feature/1-project-foundation`) และตรวจสอบโครงสร้างไฟล์ทั้งหมด | ตรวจสอบคำแนะนำของ Agent และอนุมัติแผนการตั้งต้นสำหรับ Issue 1 |
| 2 | "ก่อนแก้ไฟล์ ให้ตรวจสถานะและโครงสร้างปัจจุบันก่อน แล้วสรุปสิ่งที่จะทำสั้น ๆ" | สำรวจไฟล์ใน `toktickit/`, ตรวจสอบ database provider (`postgresql`) และยืนยันว่าไม่มี logic Issue 2-4 ปนใน Issue 1 | ยืนยันข้อสรุปของ Agent ก่อนให้ดำเนินการปรับปรุงเอกสารและไฟล์คอนฟิก |
| 3 | "เขียน README.md เป็น setup instructions" | สร้างไฟล์ `README.md` ครอบคลุมภาพรวมระบบ, Tech Stack, Prerequisites, Environment Setup, วิธีรัน Client/Server และคำสั่งรัน Test | ตรวจสอบเนื้อหาใน `README.md` เพื่อให้ตรงตามข้อกำหนดใน `PROJECT_STRUCTURE.md` |
| 4 | "สร้างไฟล์ .env จาก .env.example และตั้งค่า environment variables" | สร้าง `client/.env` และ `server/.env` โดยอ้างอิงจาก `.env.example` และตรวจสอบให้มั่นใจว่า `.gitignore` ละเว้นการติดตามไฟล์ `.env` | ตรวจสอบพอร์ต (3000, 5173) และ `DATABASE_URL` ให้ถูกต้อง |
| 5 | "แก้ไขปัญหา `tsc` แตกไฟล์ `.js` ใน `client/src` เมื่อรัน `npm run build`" | เพิ่ม `"noEmit": true` ใน `client/tsconfig.json` และลบไฟล์ `.js` ที่ถูกเจนเกินออก | ทดสอบรัน `npm run build` อีกครั้ง พบว่า build ผ่านโดยไม่ทิ้งไฟล์ขยะไว้ใน source tree |
| 6 | "รันและตรวจสอบเฉพาะ tests และ commands ที่เกี่ยวกับ Foundation" | รัน `npm install`, `npm run build`, `npm test` ทั้งใน `client` และ `server` แล้วสรุปผลลัพธ์การทดสอบ | ยืนยันว่า UI-01 ผ่าน และ backend test (API-01) ตอบกลับ 501 เพื่อเตรียมรอดำเนินการต่อใน Issue 2 |
| 7 | "ช่วยแก้ไฟล์ tests.md กับเพิ่ม ai_use.md ให้หน่อย" | ปรับแต่ง `docs/lab-01/tests.md` ให้มีตาราง Test Cases (API-01–02, UI-01–03) และเขียน `docs/lab-01/ai_use.md` บันทึกประวัติการใช้ AI | ตรวจสอบความถูกต้องของตาราง Test Plan และ Reflection ให้ตรงตามเกณฑ์ให้คะแนน Part 3 |
| 8 | "เริ่มทำเลย (Issue 2 — API Health Check)" | สร้าง branch `feature/2-health-check`, implement `GET /api/health` คืน 200 `{ status: "ok", service: "TokTickIT API" }`, อัปเดต `checkSystem()` ใน client และทดสอบ Supertest (API-01 PASS) | รัน `npm test` ยืนยันว่า `health.test.ts` ผ่าน 100% |

---

## Reflection (บทสะท้อนความคิด)

การกำหนด **Source of Truth** (เช่น `lab1_checklist.md` และ `PROJECT_STRUCTURE.md`) อย่างชัดเจนตั้งแต่เปิด Prompt แรก ช่วยให้ AI ทำงานได้อย่างแม่นยำและไม่หลงไปสร้างโค้ดส่วนเกินที่ขัดกับ Git Flow ข้อดีของ Agent คือช่วยตรวจสอบรายละเอียดเล็กๆ เช่น การตั้งค่า `provider = "postgresql"` ใน Prisma และการแก้ไข `tsconfig.json` ไม่ให้เจนไฟล์ `.js` รบกวน source code

อย่างไรก็ตาม มีจุดที่ต้องกำกับดูแล AI อย่างใกล้ชิด คือการป้องกันไม่ให้ AI แอบเขียนหรือดึง logic สำหรับ Issue 2–4 (เช่น Health Check หรือ Categories API) เข้ามาใส่ล่วงหน้าตั้งแต่ Issue 1 รวมถึงการย้ำเตือนไม่ให้ Agent สั่ง `git commit` หรือ `git push` โดยอัตโนมัติ เพื่อให้กระบวนการ Incremental Development และ PR Review เป็นไปตามขั้นตอนวิศวกรรมซอฟต์แวร์ที่ถูกต้อง
