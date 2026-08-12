# Lab 1 — Peer Review Record  (fill this in)

**Author:** <นางสาวธนภรณ์ บุณฑริกมาศ> — <67070507204> — GitHub: @<thanapornboont-star>
**Peer reviewer:** <นายจิรภัทร เจริญพิพัฒธาดา> — <67070507217> — GitHub: @<jiraphat-j>

## Pull Requests I authored (reviewed by my partner)
| PR | Branch | Reviewer verdict |
|----|--------|------------------|
|  #5  | feature/1-project-foundation | Approve |
|  #6  | feature/2-health-check | Approve |
|    | feature/3-category-seed |  |
|    | feature/4-category-list |  |

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




How I responded: <ขอบคุณจ้า ><ขอบคุณคับ เดี๋ยวแก้ไขคับ/ แก้ไขเรียบร้อยแล้วคับ ช่วยตรวจให้อีกทีแล้วapprove ให้หน่อยคับ>

## Pull Requests I reviewed for my partner
My comment: <README.md ครบถ้วนและเป็นมืออาชีพ — มีการระบุ Tech Stack, Prerequisites, 
ขั้นตอนการตั้งค่า .env, การรัน Migration/Seed และคำสั่งรัน Dev Server / Tests 
ไว้อย่างชัดเจน มีการอธิบายโครงสร้างโฟลเดอร์ (Repository Structure) ช่วยให้
คนในทีมและอาจารย์ตรวจงานได้ง่าย เอกสาร Lab (docs/lab-01/) มีโครงสร้างชัดเจน 
ai_use.md บันทึก Prompt และ Reflection ได้ตรงตามเงื่อนไขของรายวิชา มีการระบุ
ขอบเขตการทำงานของ AI อย่างเหมาะสม reviewer.md ลงข้อมูล Author และ Peer 
Reviewer ครบถ้วน tests.md มีการระบุสถานะของ Test แต่ละข้อชัดเจน>

<ดีหมดคับ/ กดให้ Approve ให้แล้วคับ>
Partner's response: <ขอบคุณครับ ผมจะทำการรีวิวอีกรอบแล้วค่อย merge เข้าครับ><ขอบคุณครับ! ให้ผม merge เลยไหม>
