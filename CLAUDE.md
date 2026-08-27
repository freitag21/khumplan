# คุ้มแพลน (KhumPlan) — project conventions

## โปรเจคนี้คืออะไร

เครื่องมือสำหรับตัวแทนประกัน (ชีวิต/สุขภาพ/สะสมทรัพย์/ยูนิตลิงก์) เจ้าของโปรเจคเป็นตัวแทนเอง
ชื่อ **คุ้มแพลน / KhumPlan** ("คุ้ม" = คุ้มครอง + คุ้มค่า) · โดเมนเป้าหมาย khumplan.com · **แยกขาดจาก ChanSpace**

- **Module A** (กำลังทำ): แบบสอบถาม (ตัวแทนกรอกเอง) → อินโฟกราฟิก Protection Gap + ประเภทประกันที่ควรพิจารณา + สิทธิลดหย่อนภาษี
- **Module B** (ถัดไป): สมุดลูกค้าส่วนตัว + เตือนต่ออายุ/วันเกิด (LINE) + โอกาส resale
- **Module C** (ทีหลัง): สถิติรวมแบบไม่ระบุตัวตน — เฉพาะตัวเลข aggregate, opt-in, ขนาดกลุ่มขั้นต่ำ (k-anonymity)

## Stack

Vite (vanilla JS, no framework) + Supabase (auth + Postgres RLS) + **Vercel**
(เลือก Vercel ไม่ใช่ Netlify — Netlify free tier มีระบบเครดิต deploy ที่เคยเจ็บกับ ChanSpace, Vercel Hobby ไม่มี)

ดีไซน์: ระบบ "Nocturne" (light palette) จาก Claude Design — โทเคน/คอมโพเนนต์อยู่ใน `src/styles/main.css`
mockup ต้นฉบับ + โน้ตอยู่ใน `design/`

## หลักการที่ห้ามพลาด

1. **Compliance (คปภ.)**: ไม่สร้างสิ่งที่ดูเหมือนตารางผลประโยชน์ทางการของบริษัท, ไม่ระบุชื่อแบบประกัน/บริษัทในคำแนะนำ (แนะนำเป็น "ประเภท" เท่านั้น), ตัวเลขไม่การันตีต้องไม่ทำให้ดูการันตี ทุกหน้าผลลัพธ์ต้องมี disclaimer
2. **PDPA**: ตัวแทน = ผู้ควบคุมข้อมูลลูกค้า, แพลตฟอร์ม = ผู้ประมวลผล เก็บข้อมูลให้น้อยที่สุด ข้อมูลลูกค้าดิบ **ไม่แชร์ข้ามตัวแทน** (บังคับด้วย RLS)
3. **สมมติฐานการเงิน** อยู่รวมที่ `src/lib/assumptions.js` ที่เดียว — มี TODO ให้ทบทวนกับกลุ่มตัวแทน อย่า hardcode กระจาย
4. engine (`src/lib/`) ต้องเป็น pure function + มีเทสต์ (`npm test`) ก่อน commit

## Deploy / commit discipline

- ยังควร **batch งานก่อน push** (สะสมหลายอย่างแล้วค่อย push ครั้งเดียว) แม้ Vercel Hobby จะไม่มีลิมิต deploy รายเดือนแบบ Netlify
- commit ที่ไม่แตะไฟล์ build (แก้เฉพาะ .md / docs) ใส่ `[skip ci]` ในข้อความ commit

## Cross-machine memory

โปรเจคนี้ทำจากหลายเครื่อง (Windows + Mac) memory ของ Claude ไม่ sync เอง
มิเรอร์ memory ที่เกี่ยวกับโปรเจคนี้ไว้ที่ Google Drive `ClaudeMemory/KhumPlan/`
(`G:\My Drive\ClaudeMemory\KhumPlan\` บน Windows) — ต้นเซสชันให้อ่าน `MEMORY.md` ที่นั่นก่อน
หลังบันทึก memory ใหม่ ให้ก๊อปเข้าโฟลเดอร์นั้นด้วย
