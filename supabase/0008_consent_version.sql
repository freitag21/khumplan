-- คุ้มแพลน (KhumPlan) — migration 0008: เวอร์ชันความยินยอมของลูกค้า
-- วางใน Supabase Dashboard → SQL Editor → Run · รันซ้ำได้ ปลอดภัย
--
-- ที่มา: รีวิวของ Win ข้อ 4.2 — หลักฐาน consent ควรผูกกับข้อความเวอร์ชันที่ลูกค้ายอมรับ
--   (แบบเดียวกับ agents.policy_accepted_version)

alter table public.clients
  add column if not exists consent_version text;
