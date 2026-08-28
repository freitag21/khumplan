-- คุ้มแพลน (KhumPlan) — migration 0004: สมุดลูกค้า (Module B core)
-- วางใน Supabase Dashboard → SQL Editor → Run · รันซ้ำได้ ปลอดภัย
--
-- เพิ่ม:
--   public.clients   — สมุดลูกค้า (คนที่ตัวแทนดูแล) 1 แถว = 1 คน
--   public.policies  — กรมธรรม์ที่ลูกค้าถืออยู่ (หลายกรมธรรม์ต่อ 1 ลูกค้า)
--   analyses.client_id — ผูกผลวิเคราะห์เข้ากับลูกค้าในสมุด (nullable)
--   public.set_updated_at() — trigger กลางอัปเดต updated_at

-- ═══════════ trigger กลาง: updated_at ═══════════
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ═══════════ ตาราง clients (สมุดลูกค้า) ═══════════
create table if not exists public.clients (
  id              uuid primary key default gen_random_uuid(),
  agent_id        uuid not null references public.agents (id) on delete cascade,
  full_name       text not null,
  nickname        text,
  birth_date      date,
  sex             text check (sex in ('M','F')),
  phone           text,
  line_id         text,
  occupation      text,
  marital_status  text,
  note            text,
  -- หลักฐานความยินยอม (PDPA) — ต้องยืนยันก่อนบันทึกลูกค้าเข้าสมุด
  pdpa_consent    boolean not null default false,
  pdpa_consent_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists clients_agent_idx on public.clients (agent_id, full_name);

alter table public.clients enable row level security;

drop policy if exists "clients owner all" on public.clients;
create policy "clients owner all" on public.clients
  for all using (auth.uid() = agent_id) with check (auth.uid() = agent_id);

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- ═══════════ ตาราง policies (กรมธรรม์ที่ถืออยู่) ═══════════
create table if not exists public.policies (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients (id) on delete cascade,
  agent_id      uuid not null references public.agents (id) on delete cascade,
  kind          text not null default 'life'
                  check (kind in ('life','health','ci','pa','annuity','savings','unitlinked','group','other')),
  insurer       text,
  plan_name     text,
  sum_assured   numeric,
  premium       numeric,
  premium_freq  text default 'year'
                  check (premium_freq in ('year','half','quarter','month','single')),
  renewal_date  date,
  status        text not null default 'active'
                  check (status in ('active','lapsed','paidup','matured','surrendered','pending')),
  exclusions    text,   -- ข้อยกเว้น / เบี้ยเพิ่ม (loading) / เงื่อนไขพิเศษ จากการพิจารณารับประกัน
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists policies_client_idx  on public.policies (client_id);
create index if not exists policies_renewal_idx on public.policies (agent_id, renewal_date)
  where status = 'active' and renewal_date is not null;

alter table public.policies enable row level security;

drop policy if exists "policies owner all" on public.policies;
create policy "policies owner all" on public.policies
  for all using (auth.uid() = agent_id) with check (auth.uid() = agent_id);

drop trigger if exists policies_set_updated_at on public.policies;
create trigger policies_set_updated_at
  before update on public.policies
  for each row execute function public.set_updated_at();

-- ═══════════ ผูกผลวิเคราะห์เข้ากับลูกค้าในสมุด ═══════════
alter table public.analyses
  add column if not exists client_id uuid references public.clients (id) on delete set null;

create index if not exists analyses_client_idx on public.analyses (client_id);
