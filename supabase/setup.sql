-- คุ้มแพลน (KhumPlan) — SQL ตั้งค่าครบในไฟล์เดียว
-- วางทั้งหมดนี้ใน Supabase Dashboard → SQL Editor → Run
-- (รวม migration 0001 + 0002 + 0003 + 0004 + 0005 · รันซ้ำได้ ปลอดภัย)

-- ═══════════ ตาราง agents (โปรไฟล์ตัวแทน) ═══════════
create table if not exists public.agents (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  display_name text,
  line_id      text,
  company      text,
  license_no   text,
  created_at   timestamptz not null default now()
);

alter table public.agents
  add column if not exists policy_accepted_at      timestamptz,
  add column if not exists policy_accepted_version text;

alter table public.agents enable row level security;

drop policy if exists "agents read own" on public.agents;
drop policy if exists "agents upsert own" on public.agents;
drop policy if exists "agents update own" on public.agents;
create policy "agents read own"   on public.agents for select using (auth.uid() = id);
create policy "agents upsert own" on public.agents for insert with check (auth.uid() = id);
create policy "agents update own" on public.agents for update using (auth.uid() = id);

-- สร้างแถว agents อัตโนมัติเมื่อสมัคร + เก็บ display_name / หลักฐานการยอมรับนโยบาย จาก metadata
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.agents (id, email, display_name, policy_accepted_at, policy_accepted_version)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), ''),
    (new.raw_user_meta_data->>'policy_accepted_at')::timestamptz,
    nullif(new.raw_user_meta_data->>'policy_accepted_version', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.agents.display_name, excluded.display_name),
        policy_accepted_at = coalesce(public.agents.policy_accepted_at, excluded.policy_accepted_at),
        policy_accepted_version = coalesce(public.agents.policy_accepted_version, excluded.policy_accepted_version);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ห้ามแก้หลักฐานการยอมรับนโยบายหลังบันทึกแล้ว
create or replace function public.freeze_policy_consent()
returns trigger language plpgsql as $$
begin
  if old.policy_accepted_at is not null then new.policy_accepted_at := old.policy_accepted_at; end if;
  if old.policy_accepted_version is not null then new.policy_accepted_version := old.policy_accepted_version; end if;
  return new;
end;
$$;

drop trigger if exists agents_freeze_consent on public.agents;
create trigger agents_freeze_consent
  before update on public.agents
  for each row execute function public.freeze_policy_consent();

-- ═══════════ ตาราง analyses (ผลวิเคราะห์) ═══════════
create table if not exists public.analyses (
  id                uuid primary key default gen_random_uuid(),
  agent_id          uuid not null references public.agents (id) on delete cascade,
  slug              text unique not null,
  client_name       text,
  client_age        int,
  client_sex        text check (client_sex in ('M','F')),
  marital_status    text,
  occupation        text,
  input             jsonb not null,
  summary           jsonb not null,
  consent_confirmed boolean not null default false,
  share_enabled     boolean not null default true,
  expires_at        timestamptz not null default (now() + interval '90 days'),
  created_at        timestamptz not null default now()
);

create index if not exists analyses_agent_idx on public.analyses (agent_id, created_at desc);
create index if not exists analyses_slug_idx  on public.analyses (slug);

alter table public.analyses enable row level security;

drop policy if exists "analyses owner all" on public.analyses;
drop policy if exists "analyses read by slug" on public.analyses;
create policy "analyses owner all" on public.analyses
  for all using (auth.uid() = agent_id) with check (auth.uid() = agent_id);

-- ═══════════ หน้าแชร์: อ่านผ่าน RPC ด้วย slug เท่านั้น ═══════════
create or replace function public.get_shared_analysis(p_slug text)
returns table (
  input jsonb, summary jsonb, client_name text, created_at timestamptz,
  agent_name text, agent_line text, agent_license text
)
language sql security definer stable set search_path = public as $$
  select a.input, a.summary, a.client_name, a.created_at,
         ag.display_name, ag.line_id, ag.license_no
  from public.analyses a
  join public.agents ag on ag.id = a.agent_id
  where a.slug = p_slug and a.share_enabled = true and a.expires_at > now()
  limit 1;
$$;

revoke all on function public.get_shared_analysis(text) from public;
grant execute on function public.get_shared_analysis(text) to anon, authenticated;

-- ═══════════ ปิดบัญชี (ลบบัญชีตัวเอง + ข้อมูลที่เกี่ยวข้อง) ═══════════
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- ═══════════ 0004 · สมุดลูกค้า (Module B core) ═══════════

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

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
  exclusions    text,
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

alter table public.analyses
  add column if not exists client_id uuid references public.clients (id) on delete set null;
create index if not exists analyses_client_idx on public.analyses (client_id);

-- ═══════════ 0005 · งานติดตาม (follow-ups) ═══════════

alter table public.clients
  add column if not exists stage text not null default 'customer'
    check (stage in ('prospect', 'customer'));

create table if not exists public.reminders (
  id         uuid primary key default gen_random_uuid(),
  agent_id   uuid not null references public.agents (id) on delete cascade,
  client_id  uuid references public.clients (id) on delete cascade,
  kind       text not null default 'custom'
               check (kind in ('nurture', 'resale', 'renewal', 'birthday', 'custom')),
  title      text not null,
  detail     text,
  due_date   date not null,
  done       boolean not null default false,
  done_at    timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reminders_agent_due_idx on public.reminders (agent_id, done, due_date);
alter table public.reminders enable row level security;
drop policy if exists "reminders owner all" on public.reminders;
create policy "reminders owner all" on public.reminders
  for all using (auth.uid() = agent_id) with check (auth.uid() = agent_id);
drop trigger if exists reminders_set_updated_at on public.reminders;
create trigger reminders_set_updated_at
  before update on public.reminders
  for each row execute function public.set_updated_at();
