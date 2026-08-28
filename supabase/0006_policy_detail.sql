-- คุ้มแพลน (KhumPlan) — migration 0006: รายละเอียดกรมธรรม์ + สัญญาเพิ่มเติม + ฟิลด์บริการ
-- วางใน Supabase Dashboard → SQL Editor → Run · รันซ้ำได้ ปลอดภัย
--
-- ที่มา: รีวิวของ Win — ปิดวงจร สมุดลูกค้า ⇄ Protection Gap + ชั้น persistency
--   - ฟิลด์ความคุ้มครองตามชนิด (สุขภาพใช้ค่าห้อง/เหมาจ่าย ไม่ใช่ "ทุน")
--   - parent_policy_id: สัญญาเพิ่มเติม (rider) เป็นบรรทัดย่อยใต้สัญญาหลัก ไม่นับเป็นกรมธรรม์แยก
--   - ฟิลด์ที่ใช้ทำงานบริการจริง: เลขที่กรมธรรม์ ช่องทางชำระเบี้ย ผู้รับประโยชน์ ฯลฯ

alter table public.policies
  add column if not exists policy_no        text,
  add column if not exists parent_policy_id uuid references public.policies (id) on delete cascade,
  add column if not exists health_room_daily numeric,   -- ค่าห้อง/วัน (หมวดสุขภาพ)
  add column if not exists health_annual     numeric,   -- วงเงินเหมาจ่าย/ปี (หมวดสุขภาพ)
  add column if not exists has_copay         boolean,   -- มี copay หรือไม่
  add column if not exists ci_sum            numeric,   -- ทุนโรคร้ายแรง (แยกจาก sum_assured กรณีเป็น rider)
  add column if not exists payment_method    text
    check (payment_method in ('self', 'bank', 'card', 'payroll', 'other')),
  add column if not exists start_date        date,      -- วันเริ่มสัญญา
  add column if not exists paid_to_year      int,       -- ชำระเบี้ยถึงปี พ.ศ.
  add column if not exists beneficiary       text;      -- ผู้รับประโยชน์ + ความสัมพันธ์

create index if not exists policies_parent_idx on public.policies (parent_policy_id)
  where parent_policy_id is not null;

alter table public.clients
  add column if not exists referred_by text,                          -- ผู้แนะนำ
  add column if not exists orphan      boolean not null default false; -- รับดูแลต่อ (orphan case)
