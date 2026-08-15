# Lab 1 — Peer Review Record  (fill this in)

**Author:** <นางสาวธนภรณ์ บุณฑริกมาศ> — <67070507204> — GitHub: @<thanapornboont-star>
**Peer reviewer:** <นายจิรภัทร เจริญพิพัฒธาดา> — <67070507217> — GitHub: @<jiraphat-j>

## Pull Requests I authored (reviewed by my partner)
| PR | Branch | Reviewer verdict |
|----|--------|------------------|
|  #5  | feature/1-project-foundation | Approve |
|  #6  | feature/2-health-check | Approve |
|  #7  | feature/3-category-seed | Approve |
|  #8  | feature/4-category-list | Approve |

Reviewer comment I received: <เช็คตาม acceptance criteria ครบแล้วครับ> 

<เช็คตาม acceptance criteria ของ Issue 2 ส่วนใหญ่ครบแล้วครับ 👍
(health endpoint คืนค่าถูกต้อง, checkSystem() เรียก API จริง, มี Supertest ผ่าน)

2 จุดที่อยากให้พิจารณาก่อน merge:

checkSystem() ใน api.ts ยังไม่ครอบ fetch() ด้วย try/catch — ถ้า backend
ปิดสนิท (connection refused) จะโยน error ดิบของ browser แทนข้อความที่
อ่านง่าย ลองเพิ่ม try/catch แล้ว throw ข้อความที่กำหนดไว้แทนได้ไหม?

tests.md บอกว่า UI-02/UI-03 (Online/Offline display) ยัง Pending สำหรับ
Issue 4 — อยากเช็คว่านี่ตั้งใจ defer จริง เพราะ App.tsx ดูเหมือนมีโค้ด
แสดงผล success/error state พร้อมอยู่แล้ว/ เรียบร้อยดีแล้วครับ ไปกันต่อออ!>

<เช็คตาม acceptance criteria ของ Issue 3 ครบแล้วครับ
Category model, migration, และ seed script (upsert) ถูกต้องตรงสเปคทั้งหมด
ผ่านครับ เยี่ยมครับ สวยครับ>

<เช็คตาม acceptance criteria ของ Issue 4 ครบทุกข้อครับ

GET /api/categories ดึงจาก DB จริง เรียง id ตามลำดับที่กำหนด
error handling ฝั่ง server ปลอดภัย (ไม่หลุด internal details)
Supertest ตรวจครบทั้ง status/count/ชื่อ/ลำดับ ไม่ใช่แค่ assert ผิวเผิน
UI ดึงจาก API จริง มี loading/success/error state ครบ
เห็นว่าแก้ปัญหา try/catch ใน api.ts ที่ค้างจาก Issue 2 เรียบร้อยแล้วด้วย
ผ่านเลยครับ>

How I responded: <ขอบคุณจ้า ><ขอบคุณคับ เดี๋ยวแก้ไขคับ/ แก้ไขเรียบร้อยแล้วคับ ช่วยตรวจให้อีกทีแล้วapprove ให้หน่อยคับ><เริ่ดคับ><ขอบคุณมากคับ>

## Pull Requests I reviewed for my partner
My comment: <README.md ครบถ้วนและเป็นมืออาชีพ — มีการระบุ Tech Stack, Prerequisites, 
ขั้นตอนการตั้งค่า .env, การรัน Migration/Seed และคำสั่งรัน Dev Server / Tests 
ไว้อย่างชัดเจน มีการอธิบายโครงสร้างโฟลเดอร์ (Repository Structure) ช่วยให้
คนในทีมและอาจารย์ตรวจงานได้ง่าย เอกสาร Lab (docs/lab-01/) มีโครงสร้างชัดเจน 
ai_use.md บันทึก Prompt และ Reflection ได้ตรงตามเงื่อนไขของรายวิชา มีการระบุ
ขอบเขตการทำงานของ AI อย่างเหมาะสม reviewer.md ลงข้อมูล Author และ Peer 
Reviewer ครบถ้วน tests.md มีการระบุสถานะของ Test แต่ละข้อชัดเจน>

<ดีหมดคับ/ กดให้ Approve ให้แล้วคับ>

<โดยรวมโครงสร้างของ Category model, migration และ seed ตรงตาม requirement ของ Issue 3คับ ดีมากคับ>

<มี 2 จุดที่อยากให้ช่วยแก้:
-ใน client/src/api.ts ตรงการเรียก /api/categories มีการเรียก API ซ้ำใน catch และมีการประกาศ categories ซ้ำภายใน scope เดียวกัน รบกวนช่วยปรับ logic ให้เรียบง่ายและไม่มีการเรียก API ซ้ำโดยไม่จำเป็นครับ
-ใน client/tests/lab-01/App.test.tsx ยังมี it.todo() สำหรับ success/error state อยู่ ทั้งที่มี test จริง implement อยู่ด้านล่างแล้ว รบกวนลบ it.todo() ที่ซ้ำออก เพื่อไม่ให้ test tracking สับสนคับ>


Partner's response: <ขอบคุณครับ ผมจะทำการรีวิวอีกรอบแล้วค่อย merge เข้าครับ><ขอบคุณครับ! ให้ผม merge เลยไหม><ขอบคุณครับ><ขอบคุณครับ! ผมแก้ไขทั้ง 2 จุดตามที่แนะนำเรียบร้อยครับ:

ปรับปรุง logic ใน client/src/api.ts ให้กระชับ ยิงเรียก /api/health และ /api/categories โดยไม่มีการเรียกซ้ำแล้วครับ
ลบ it.todo() ที่ซ้ำซ้อนใน App.test.tsx ออกแล้วครับ
Push commit แก้ไขขึ้นเรียบร้อย รบกวนตรวจและ Approve ให้หน่อยนะครับคนสวย>
