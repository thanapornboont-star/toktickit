# Lab 1 — Test Plan and Evidence

เอกสารสรุปแผนการทดสอบ (Test Plan) และสถานะผลการทดสอบ (Test Evidence) สำหรับระบบ **TokTickIT**

---

## 1. Test Suite Overview

ไฟล์ทดสอบทั้งหมดจัดเก็บอยู่ในโครงสร้างดังนี้:
- **Backend Tests**: `server/tests/lab-01/`
- **Frontend Tests**: `client/tests/lab-01/`

---

## 2. Automated Test Cases Table

| Test ID | Tool | Scope | File Location | Test Description | Status (Issue 1) |
|---|---|---|---|---|---|
| **API-01** | Supertest | Server API | `server/tests/lab-01/health.test.ts` | `GET /api/health` คืนค่า HTTP 200 พร้อม `{ status: "ok", service: "TokTickIT API" }` | Pending (Issue 2) |
| **API-02** | Supertest | Server API | `server/tests/lab-01/categories.test.ts` | `GET /api/categories` คืนค่า 4 หมวดหมู่ที่ seeded ไว้เรียงตาม ID | Pending (Issue 4) |
| **UI-01** | Vitest + React Testing Library | Client UI | `client/tests/lab-01/App.test.tsx` | แสดงผล Header `TokTickIT IT Service Desk` ได้ถูกต้อง | ✅ PASS |
| **UI-02** | Vitest + React Testing Library | Client UI | `client/tests/lab-01/App.test.tsx` | เมื่อกดปุ่มและ API สำเร็จ จะแสดง `System Status: Online` พร้อมรายการ 4 categories | Pending (Issue 4) |
| **UI-03** | Vitest + React Testing Library | Client UI | `client/tests/lab-01/App.test.tsx` | เมื่อ API ล้มเหลว จะแสดง `System Status: Offline` พร้อม error message | Pending (Issue 4) |

---

## 3. Terminal Test Execution Output Log (Issue 1 Foundation Check)

### Client Test Output (`npm test` in `client/`)
```text
 RUN  v2.1.9 D:/Lab1_Starter_Scaffold/toktickit/client

 ✓ tests/lab-01/App.test.tsx (3 tests | 2 skipped) 38ms

 Test Files  1 passed (1)
      Tests  1 passed | 2 todo (3)
```

---

## 4. Test Evidence Guidelines for Final Release (Branch `main`)

เมื่อพัฒนาครบทั้ง 4 Issues และทำการ merge เข้าสู่ branch `main` เรียบร้อยแล้ว ให้รันคำสั่งทดสอบทั้งหมดอีกครั้งและแนบผลลัพธ์คำสั่ง:
1. **Server Tests**: `cd server && npm test` (ต้องผ่านครบทั้ง API-01 และ API-02)
2. **Client Tests**: `cd client && npm test` (ต้องผ่านครบทั้ง UI-01, UI-02, UI-03)
