# Lab 2 — Peer Review Record

**Author:** นางสาวธนภรณ์ บุณฑริกมาศ — 67070507204 — GitHub: [@thanapornboont-star](https://github.com/thanapornboont-star)  
**Peer Reviewer:** นายจิรภัทร เจริญพิพัฒธาดา — 67070507217 — GitHub: [@jiraphat-j](https://github.com/jiraphat-j)

---

## Pull Requests I Authored (Reviewed & Merged by Peer Reviewer)

| PR | Feature Branch | Target Branch | Linked Issue | Reviewer Verdict | Merged By |
|:---:|---|---|---|:---:|:---:|
| #21 | `feature/11-lab2-contract` | `lab2-staging` | Closes #11 | Approved | @jiraphat-j |
| | `feature/12-dev-requester-context` | `lab2-staging` | Closes #12 | | @jiraphat-j |
| | `feature/#NN-create-ticket-api` | `lab2-staging` | Closes #NN | | @jiraphat-j |
| | `feature/#NN-attachments-api` | `lab2-staging` | Closes #NN | | @jiraphat-j |
| | `feature/#NN-requester-selector-ui` | `lab2-staging` | Closes #NN | | @jiraphat-j |
| | `feature/#NN-create-ticket-ui` | `lab2-staging` | Closes #NN | | @jiraphat-j |
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

### PR for Issue #12: Development Requester schema, seed, and context API
- **Reviewer Comment (@jiraphat-j):**
  > "ตรวจ final diff แล้วครับ จุด implementation หลักโอเคแล้ว เหลือ docs/lab-02/tests.md ที่ API-03 มีรายการซ้ำกัน รบกวนเช็ก/จัดให้ test ID ไม่ซ้ำกันครับ แล้วผมจะ review ต่อครับ"
- **My Response (@thanapornboont-star):**
   > "แก้ไขจัดเรียง Test ID ใน docs/lab-02/tests.md ใหม่ตั้งแต่ API-01 ถึง API-12 ไม่ให้มีรายการซ้ำกัน และอัปเดต Traceability Matrix ให้สอดคล้องกันเรียบร้อยแล้วใน commit ล่าสุดแล้วค่ะ ช่วยเช็คอีกทีนะคะ"

---

## Pull Requests I Reviewed for My Partner

- **Partner's PR Link:** [PR on Partner's Repository]
- **My Review Comment:**
  > "จากที่ดูค่อนข้างครบถ้วนค่ะ"
  > "ตรวจแล้วค่ะ โครงสร้าง schema, migration, seed และ API โดยรวมครบถ้วน และ seed ใช้ upsert ทำให้รันซ้ำได้โดยไม่เกิดข้อมูลซ้ำ LGTM"
- **Partner's Response:**
  > "ค้าบขอบคุณครับ"
