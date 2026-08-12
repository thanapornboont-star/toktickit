# TokTickIT — IT Service Desk System

TokTickIT คือระบบ IT Service Desk แบบ Full-Stack สำหรับจัดการและติดตามคำขอใช้บริการด้าน IT ต่างๆ (IT Service Requests)

---

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Bootstrap 5
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL, Prisma ORM
- **Testing**: Vitest (Frontend UI Test), Supertest + Vitest (Backend Integration Test)
- **Architecture**: REST-style API architecture

---

## โครงสร้างโปรเจกต์ (Repository Structure)

```text
toktickit/
├── .gitignore
├── README.md
├── docs/
│   └── lab-01/
│       ├── ai_use.md
│       ├── reviewer.md
│       └── tests.md
├── client/
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api.ts
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   └── tests/
│       ├── setup.ts
│       └── lab-01/
│           └── App.test.tsx
└── server/
    ├── .env.example
    ├── package.json
    ├── tsconfig.json
    ├── vitest.config.ts
    ├── prisma/
    │   ├── schema.prisma
    │   └── seed.ts
    ├── src/
    │   ├── app.ts
    │   ├── index.ts
    │   └── prisma.ts
    └── tests/
        └── lab-01/
            ├── categories.test.ts
            └── health.test.ts
```

---

## ขั้นตอนการติดตั้งและการเริ่มต้นใช้งาน (Setup Instructions)

### 1. Prerequisites (สิ่งที่ต้องเตรียมก่อนเริ่มงาน)
- **Node.js**: v18.x หรือใหม่กว่า
- **npm**: v9.x หรือใหม่กว่า
- **PostgreSQL Database Server**: เปิดใช้งานพอร์ต 5432

---

### 2. Environment Variables Setup (ตั้งค่าไฟล์ .env)

#### Client (.env)
คัดลอกไฟล์ `.env.example` ไปเป็น `.env` ในโฟลเดอร์ `client/`:
```bash
cp client/.env.example client/.env
```
เนื้อหาใน `client/.env`:
```env
VITE_API_URL="http://localhost:3000"
```

#### Server (.env)
คัดลอกไฟล์ `.env.example` ไปเป็น `.env` ในโฟลเดอร์ `server/`:
```bash
cp server/.env.example server/.env
```
เนื้อหาใน `server/.env`:
```env
DATABASE_URL="postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public"
PORT=3000
```
> **หมายเหตุ**: ปรับแต่ง `DATABASE_URL` ให้ตรงกับ username, password, host, port และ database name ของ PostgreSQL บนเครื่องของคุณ

---

### 3. Frontend Setup (Client)

```bash
# 1. เข้าไปยังโฟลเดอร์ client
cd client

# 2. ติดตั้ง Dependencies
npm install

# 3. รัน Development Server
npm run dev

# 4. รัน Unit/Component Tests
npm test

# 5. Build Project สำหรับ Production
npm run build
```
เปิดเบราว์เซอร์ไปที่ `http://localhost:5173` เพื่อใช้งานหน้าเว็บ Frontend

---

### 4. Backend & Database Setup (Server)

```bash
# 1. เข้าไปยังโฟลเดอร์ server
cd server

# 2. ติดตั้ง Dependencies
npm install

# 3. สร้าง Prisma Client
npx prisma generate

# 4. (สำหรับ Issue 3 เป็นต้นไป) ทำ Database Migration & Seed
npm run prisma:migrate
npm run prisma:seed

# 5. รัน Backend Development Server
npm run dev

# 6. รัน Backend Integration Tests
npm test
```
Backend API Server จะเปิดให้บริการที่ `http://localhost:3000`

---

## การทดสอบ (Testing Framework)

- **Frontend Tests**: ใช้ Vitest + `@testing-library/react` ทดสอบ React Components ภายใต้สภาพแวดล้อม `jsdom` (คำสั่ง `npm test` ใน `client/`)
- **Backend Tests**: ใช้ Vitest + Supertest ทดสอบ Express API Router ภายใต้สภาพแวดล้อม `node` (คำสั่ง `npm test` ใน `server/`)