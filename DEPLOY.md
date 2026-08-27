# Deploy — KhumPlan

**Hosting: Vercel** (Hobby plan, ฟรี)

เลือก Vercel เพราะ:
- ไม่มีระบบ "เครดิตต่อ deploy" แบบ Netlify (ปัญหาที่ ChanSpace เจอ) — push กี่ครั้งก็ deploy ได้
- Hobby: bandwidth 100 GB/เดือน, build ไม่จำกัดจำนวน, HTTPS + custom domain ฟรี
- รองรับ Vite เป็น framework preset อยู่แล้ว

โปรเจคพร้อม deploy แล้ว: `vercel.json` (framework/build/SPA rewrite), `.gitignore` (กัน `.env`, `.vercel/`), tests 26/26 ผ่าน, `npm run build` ผ่าน

---

## ขั้นตอน (ครั้งแรก)

### 1. ขึ้น GitHub

สร้าง repo ว่างชื่อ `khumplan` ที่ github.com (private ก็ได้) **อย่าให้มันสร้าง README/gitignore ให้** แล้ว:

```bash
cd /path/to/KhumPlan
git remote add origin https://github.com/<user>/khumplan.git
git push -u origin main
```

### 2. เชื่อม Vercel

1. เข้า vercel.com → **Add New… → Project** → เลือก repo `khumplan`
2. Framework Preset ควรขึ้น **Vite** อัตโนมัติ (build `npm run build`, output `dist`) — ปล่อยตามนั้น
3. **Environment Variables** — ใส่ 2 ตัว (จาก `.env` ในเครื่อง):

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://aprxmywhkgcmvchsdaqs.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | (anon key จาก `.env`) |

   > anon key ปลอดภัยที่จะอยู่ใน bundle ฝั่ง browser — RLS เป็นตัวคุมสิทธิ์จริง
4. **Deploy** — ได้ URL `khumplan.vercel.app`

### 3. ต่อ Domain

1. Vercel → Project → **Settings → Domains** → ใส่ `khumplan.com` (+ `www.khumplan.com`)
2. Vercel จะบอกค่า DNS ที่ต้องตั้งที่ผู้ให้บริการโดเมน:
   - `A` record `@` → `76.76.21.21`
   - `CNAME` `www` → `cname.vercel-dns.com`
   - (หรือย้าย nameserver ไปที่ Vercel เลยก็ได้)
3. รอ DNS propagate (ไม่กี่นาที–ชั่วโมง) Vercel ออก SSL ให้อัตโนมัติ

### 4. อัปเดต Supabase Auth URL

หลังโดเมนใช้งานได้ — Supabase Dashboard → **Authentication → URL Configuration**:
- **Site URL**: `https://khumplan.com`
- **Redirect URLs** (เพิ่ม ไม่ต้องลบ localhost): `https://khumplan.com/**`, `https://www.khumplan.com/**`, `https://khumplan.vercel.app/**`

> จำเป็น — ลิงก์ยืนยันอีเมล / รีเซ็ตรหัสผ่าน ใช้ `window.location.origin` เป็น redirect ซึ่งต้องอยู่ใน allowlist ไม่งั้น Supabase ปฏิเสธ

### 5. เปิด Confirm email

Supabase → **Authentication → Providers → Email** → เปิด **Confirm email** (ตอนนี้ปิดไว้ทดสอบ)

---

## หลังจากนี้

- `git push origin main` → Vercel auto-deploy production
- push branch อื่น / เปิด PR → ได้ preview URL อัตโนมัติ
- ไม่ต้องกังวลจำนวน deploy เหมือน Netlify — push ได้ตามปกติ

## ทางเลือก: deploy จากเครื่องโดยไม่ผ่าน GitHub

```bash
npm i -g vercel
vercel login          # ยืนยันผ่าน browser
vercel                 # preview
vercel --prod          # production
```
ยังต้องตั้ง env vars ผ่าน `vercel env add` หรือหน้า dashboard อยู่ดี
