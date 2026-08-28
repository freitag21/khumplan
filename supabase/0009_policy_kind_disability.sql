-- คุ้มแพลน (KhumPlan) — migration 0009: เพิ่มประเภทกรมธรรม์ "ทุพพลภาพ" (TPD / DI)
-- วางใน Supabase Dashboard → SQL Editor → Run · รันซ้ำได้ ปลอดภัย
--
-- ที่มา: แยกทุพพลภาพออกจาก PA เป็นหมวดเต็มในเครื่องวิเคราะห์ → สมุดลูกค้าต้องบันทึกกรมธรรม์ชนิดนี้ได้

alter table public.policies drop constraint if exists policies_kind_check;
alter table public.policies
  add constraint policies_kind_check
  check (kind in ('life','health','ci','pa','disability','annuity','savings','unitlinked','group','other'));
