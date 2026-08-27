-- คุ้มแพลน (KhumPlan) — SQL ตั้งค่าครบในไฟล์เดียว
-- วางทั้งหมดนี้ใน Supabase Dashboard → SQL Editor → Run
-- (รวม migration 0001 + 0002 + 0003 · รันซ้ำได้ ปลอดภัย)

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
