-- คุ้มแพลน (KhumPlan) — migration 0010: เพิ่มความแข็งแรงของหลักฐานความยินยอม (รีวิวไข่มุก)
-- วางใน Supabase Dashboard → SQL Editor → Run · รันซ้ำได้ ปลอดภัย
--
-- 1. policy_acceptances  — ตาราง append-only เก็บทุกครั้งที่ตัวแทนยอมรับข้อกำหนด (แก้/ลบไม่ได้)
-- 2. clients: sensitive_consent + _at  — ความยินยอมโดยชัดแจ้งสำหรับข้อมูลสุขภาพ (ม.26) แยกจากทั่วไป
-- 3. analyses: consent_version + consent_at  — ผูกหลักฐานกับข้อความเวอร์ชันที่ยอมรับ
-- 4. freeze_client_consent  — trigger กันแก้/ลบร่องรอยความยินยอมของลูกค้าหลังบันทึกแล้ว

-- ═══════════ 1. policy_acceptances (append-only) ═══════════
create table if not exists public.policy_acceptances (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid not null references public.agents (id) on delete cascade,
  version     text not null,
  document    text not null default 'terms+privacy',
  accepted_at timestamptz not null default now(),
  user_agent  text
);

create index if not exists policy_acceptances_agent_idx on public.policy_acceptances (agent_id, accepted_at desc);

alter table public.policy_acceptances enable row level security;

-- อ่านของตัวเองได้ · เพิ่มแถวของตัวเองได้ · ไม่มี policy update/delete = แก้/ลบไม่ได้แม้เจ้าของบัญชี
drop policy if exists "acceptances read own"   on public.policy_acceptances;
drop policy if exists "acceptances insert own" on public.policy_acceptances;
create policy "acceptances read own"   on public.policy_acceptances for select using (auth.uid() = agent_id);
create policy "acceptances insert own" on public.policy_acceptances for insert with check (auth.uid() = agent_id);

-- ═══════════ 2. clients: ความยินยอมข้อมูลอ่อนไหว (ม.26) ═══════════
alter table public.clients
  add column if not exists sensitive_consent    boolean not null default false,
  add column if not exists sensitive_consent_at timestamptz;

-- ═══════════ 3. analyses: เวอร์ชันความยินยอม ═══════════
alter table public.analyses
  add column if not exists consent_version text,
  add column if not exists consent_at      timestamptz;

-- ═══════════ 4. freeze_client_consent trigger ═══════════
create or replace function public.freeze_client_consent()
returns trigger language plpgsql as $$
begin
  if old.pdpa_consent_at is not null then
    new.pdpa_consent      := old.pdpa_consent;
    new.pdpa_consent_at    := old.pdpa_consent_at;
    new.consent_version    := old.consent_version;
  end if;
  if old.sensitive_consent_at is not null then
    new.sensitive_consent    := old.sensitive_consent;
    new.sensitive_consent_at := old.sensitive_consent_at;
  end if;
  return new;
end;
$$;

drop trigger if exists clients_freeze_consent on public.clients;
create trigger clients_freeze_consent
  before update on public.clients
  for each row execute function public.freeze_client_consent();
