# คุ้มแพลน · KhumPlan

เครื่องมือสำหรับ **ตัวแทนประกันชีวิต / สุขภาพ / สะสมทรัพย์ (และยูนิตลิงก์)**
"คุ้ม" = คุ้มครอง + คุ้มค่า · โดเมนที่เล็งไว้: khumplan.com

## Module A — วิเคราะห์ Protection Gap (ตัวที่กำลังทำ)

ตัวแทนกรอกข้อมูลลูกค้าหลังพูดคุย → ระบบสรุปเป็นภาพ/อินโฟกราฟิกว่า:

- ลูกค้ายังขาดการวางแผนความคุ้มครองด้านไหน (ชีวิต / สุขภาพ / โรคร้ายแรง / อุบัติเหตุ-ทุพพลภาพ / เกษียณ / ทุนการศึกษาบุตร)
- **ประเภทประกันที่ควรพิจารณา** เรียงตามลำดับความสำคัญ (ตามโปรไฟล์ + ช่องว่างที่พบ)
- **สิทธิลดหย่อนภาษี** ที่ยังใช้ได้ + ประมาณภาษีที่ประหยัดได้

> ผลลัพธ์เป็น **การประมาณการเพื่อวางแผน** ตามหลัก Needs Approach / DIME
> ไม่ใช่ตารางผลประโยชน์ของบริษัทประกัน และไม่ใช่คำแนะนำเฉพาะบุคคล

Stack: **Vite** (vanilla JS) · **Supabase** (auth + Postgres RLS) · **Vercel** ·
ดีไซน์ระบบ "Nocturne" จาก Claude Design (ดู `design/`)

## รันในเครื่อง

```bash
npm install
npm run dev      # เปิด http://localhost:5180
npm test         # รันชุดทดสอบ engine (vitest)
npm run build    # สร้าง dist/ (Vercel: framework=vite, output=dist)
```

แอปทำงานได้ทันทีแบบ **ออฟไลน์** (คำนวณ Protection Gap / MANHA ในเบราว์เซอร์)
ระบบ **สมัคร/เข้าสู่ระบบ (อีเมล + รหัสผ่าน) + แดชบอร์ด + บันทึก + ลิงก์แชร์** จะทำงานเมื่อตั้งค่า Supabase

## ตั้งค่า Supabase

1. สร้างโปรเจคที่ https://supabase.com
2. SQL Editor → รัน `supabase/migrations/0001_init.sql` แล้ว `0002_password_auth.sql`
3. คัดลอก `.env.example` เป็น `.env` แล้วใส่ `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
4. Authentication > Providers > **Email** — เปิด Email provider · เปิด "Confirm email" (แนะนำ) · ปิด Magic Link ได้
5. Authentication > URL Configuration — ใส่ Site URL + Redirect URLs (รวม localhost ตอน dev)

**สิ่งที่ตัวแทนทำได้เมื่อล็อกอิน:** ดูรายการผลวิเคราะห์ทั้งหมดของตัวเอง (ค้นหา / เปิด / แก้ไข / ลบ),
แก้ไขโปรไฟล์ที่แสดงบนรายงาน (ชื่อ, LINE, เลขใบอนุญาต), ดูสถิติรายเดือน

## โครงสร้าง

```
src/
  lib/
    assumptions.js   สมมติฐานกลาง (เงินเฟ้อ, ตัวคูณทุน, เพดานลดหย่อน) — ปรับที่นี่
    finance.js       ฟังก์ชันการเงินพื้นฐาน (FV, annuity)
    needs.js         engine หลัก: analyze(input) → 6 หมวด + summary
    tax.js           วิเคราะห์สิทธิลดหย่อนภาษี
    recommend.js     โปรไฟล์ + ช่องว่าง → ประเภทประกันที่ควรพิจารณา
    questionnaire.js  โครงแบบสอบถาม + แปลงค่าฟอร์ม → input
  ui/
    form.js          สร้างฟอร์มจาก questionnaire.js
    charts.js        กราฟ SVG (เขียนเอง ไม่มี dependency)
    results.js       หน้าสรุปผล
  main.js            ต่อทุกอย่าง + จัดการ view/auth
supabase/migrations/ schema + RLS
test/                ชุดทดสอบ engine
```

## Roadmap

- **Module A** (นี้) — วิเคราะห์ Protection Gap + อินโฟกราฟิก
- **Module B** — สมุดลูกค้า (CRM เบา): เก็บกรมธรรม์/ข้อยกเว้น, เสิร์ช, เตือนต่ออายุ-วันเกิดเข้า LINE, โอกาส resale
- **Module C** — สถิติรวมแบบไม่ระบุตัวตน (ต้องมีฐานผู้ใช้ก่อน; k-anonymity, opt-in)

ดู `PROJECT_STATUS.md` สำหรับสถานะล่าสุดและสิ่งที่ต้องตัดสินใจ
