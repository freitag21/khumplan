# Deployment log — KhumPlan

บันทึกสิ่งที่ทำกับระบบ (โค้ด + โครงสร้างพื้นฐาน + การตั้งค่า) เรียงตามวันที่
ทุกการเปลี่ยนโค้ดมี git commit กำกับ — ดูรายละเอียดเต็มที่ `git log`

---

## 2026-08-27 — เปิดใช้งานจริง (launch)

### โค้ด (commits บน `main`)
| commit | เรื่อง |
|---|---|
| `d7aea4a` | ออกแบบปิรามิดการเงินใหม่ |
| `c4f3b6e` | เพิ่มหน้า "สนับสนุนโปรเจค" |
| `0ac7785` | Print/PDF หน้าผล 1 หน้า A4 + QR พร้อมเพย์ |
| `5e95532` | แก้ layout พิมพ์ A4 พัง (grid → flexbox) |
| `6d071ad` | เตือนเมื่อเปิดหน้าผลใน in-app browser ของ LINE |
| `6580876` | หน้า "วิธีใช้" + "ติดต่อเรา" + config `CONTACT` |
| `5c1623d` | `DEPLOY.md` + อัปเดตสถานะโปรเจค |
| `3659858` | หน้า "ข้อกำหนดการใช้งาน" + "นโยบายความเป็นส่วนตัว (PDPA)" |
| `e2222ee` | หน้าแรก (root) แสดงหน้า Log in เมื่อยังไม่ล็อกอิน |
| `51b6e8a` | บังคับติ๊กยอมรับ Policy ตอนสมัคร + เก็บ `policy_accepted_at`/`_version` |
| `22d4489` | เพิ่ม `DEPLOYMENT_LOG.md` |
| `1dffcb3` | แก้โลโก้ KhumPlan หายในหน้า auth บนมือถือ (จอ < 820px) |
| `5c13ea7` | **QA รอบ Por — เครื่องคำนวณ/compliance**: การ์ดชีวิตตัวเลขบวกกันได้, อุบัติเหตุไม่นับใน priority/พีระมิด, เตือนเมื่อออมเกินกระแสเงินสด, การ์ดสุขภาพเป้าตรงกัน, ปีภาษี 2568→2569 + ปกส. 9,000→10,500, เอา SSF (ยกเลิกแล้ว) ออก, term life เลิกใช้คำ "เบี้ยจ่ายทิ้ง" |
| `023f272` | **QA รอบ Por — ความปลอดภัย/PDPA/UI**: หน้าแชร่ลูกค้าไม่มีเมนูตัวแทน, slug 128-bit, security headers + favicon + OG, Terms เพิ่มข้อผู้ควบคุม–ผู้ประมวลผล + ปุ่มปิดบัญชี (migration 0003), "ลืมรหัสผ่าน" ไม่หลอกว่าส่งอีเมลแล้ว, topbar/ไอคอน dark mode/มือถือ |

### รอบ QA — ทำต่อจนเสร็จ (2026-08-27)
- ✅ **รัน migration 0003** — user รันใน Supabase SQL Editor แล้ว (คอลัมน์ policy_accepted_*, ปุ่มปิดบัญชี, freeze consent)
- ✅ **Resend SMTP** — สมัคร Resend, domain khumplan.com verified (DNS auto ผ่าน Cloudflare integration: DKIM `resend._domainkey`, SPF `send` MX+TXT), API key `khumplan-smtp`, ใส่ใน Supabase SMTP (smtp.resend.com:465, user `resend`). ทดสอบ: password-recovery mail = **Delivered**. `EMAIL_ENABLED = true` (commit 7421bbb). เปิด "Confirm email" กลับแล้ว. rate limit → 30/ชม.
- ✅ **QR** — QR ใหม่ (e-wallet proxy) crop + ติดตั้ง (commit df7134b)
- ⏳ **ช่องติดต่อ** — ยังเป็น `sophon.ps21@gmail.com` (ตัดสินใจไม่ทำ Cloudflare Email Routing เพราะต้องแตะ apex MX ที่ใช้ serve เว็บด้วย เสี่ยงเกินคุณค่าสำหรับโปรเจคคนเดียว — Gmail ตรงไปตรงมาสำหรับ solo project)
- ⏳ (polish) แปลง `public/og.svg` → `og.png` 1200×630

### GitHub
- สร้าง repo `github.com/freitag21/khumplan` แล้ว push ทั้งหมด (branch `main`)
- ผู้ใช้ git: `freitag21`

### Vercel (host)
- Import repo เข้า project `khumplan` ภายใต้ team **"AI SmartWork" (Hobby / ฟรี)**
- Framework preset: Vite · auto-deploy เมื่อ push เข้า `main`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (Production + Preview)
- Domains:
  - `khumplan.com` — production (หลัก)
  - `www.khumplan.com` — redirect 307 → `khumplan.com`
  - `khumplan.vercel.app` — production
- ประวัติการ deploy ทั้งหมดดูได้ที่ Vercel → Deployments

### Cloudflare (DNS — โดเมนจดที่ Cloudflare Registrar)
- `CNAME @ → 4c70fa20e13fdda6.vercel-dns-017.com` — DNS only (เมฆเทา)
- `CNAME www → 4c70fa20e13fdda6.vercel-dns-017.com` — DNS only (เมฆเทา)
- ประวัติการแก้ดูได้ที่ Cloudflare → Manage Account → Audit Logs

### Supabase (auth + ฐานข้อมูล — project `aprxmywhkgcmvchsdaqs`, region Singapore)
- Authentication → URL Configuration:
  - Site URL: `https://khumplan.com`
  - Redirect URLs: `https://khumplan.com/**`, `https://www.khumplan.com/**`, `https://khumplan.vercel.app/**`, `http://localhost:5180/**`
- Authentication → Providers → Email → **"Confirm email" ปิดชั่วคราว** (ให้ตัวแทนสมัคร-ล็อกอินได้ทันที ระหว่างยังไม่ตั้ง custom SMTP)
- ประวัติดูได้ที่ Supabase → Logs & Analytics / Auth → Audit Logs

### ยังค้าง
- **Custom SMTP** (แนะนำ Resend) — จำเป็นสำหรับ "ยืนยันอีเมล" + "ลืมรหัสผ่าน" ให้ทำงานจริง
- เปิด "Confirm email" กลับหลังตั้ง SMTP เสร็จ
- (เลือกได้) redirect www เป็น 308 permanent แทน 307
