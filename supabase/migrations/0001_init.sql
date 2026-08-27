-- AgentPlan — Module A schema
-- รันใน Supabase SQL Editor (หรือ supabase db push)
--
-- หลักการความเป็นส่วนตัว:
--  - ตัวแทนแต่ละคนเห็นเฉพาะข้อมูลของตัวเอง (RLS)
--  - ข้อมูลลูกค้าดิบไม่แชร์ข้ามตัวแทน
--  - หน้าแชร์เข้าถึงผ่าน RPC ที่รับ slug เท่านั้น (ไม่เปิด select ทั้งตาราง) + ลิงก์มีวันหมดอายุ

-- ---------- โปรไฟล์ตัวแทน ----------
create table if not exists public.agents (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  display_name text,
  line_id      text,
  company      text,
  license_no   text,
  created_at   timestamptz not null default now()
);

alter table public.agents enable row level security;

drop policy if exists "agents read own" on public.agents;
drop policy if exists "agents upsert own" on public.agents;
drop policy if exists "agents update own" on public.agents;
create policy "agents read own"   on public.agents for select using (auth.uid() = id);
create policy "agents upsert own" on public.agents for insert with check (auth.uid() = id);
create policy "agents update own" on public.agents for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.agents (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- ผลวิเคราะห์ ----------
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
  consent_confirmed boolean not null default false, -- ตัวแทนยืนยันว่าได้รับความยินยอมจากลูกค้าแล้ว
  share_enabled     boolean not null default true,
  expires_at        timestamptz not null default (now() + interval '90 days'),
  created_at        timestamptz not null default now()
);

create index if not exists analyses_agent_idx on public.analyses (agent_id, created_at desc);
create index if not exists analyses_slug_idx  on public.analyses (slug);

alter table public.analyses enable row level security;

-- ตัวแทนจัดการเฉพาะของตัวเอง (select / insert / update / delete)
drop policy if exists "analyses owner all" on public.analyses;
drop policy if exists "analyses read by slug" on public.analyses; -- ลบ policy เดิมที่เปิด select ทั้งตาราง
create policy "analyses owner all" on public.analyses
  for all using (auth.uid() = agent_id) with check (auth.uid() = agent_id);

-- ---------- หน้าแชร์: อ่านผ่าน RPC ด้วย slug เท่านั้น ----------
-- คืนเฉพาะฟิลด์ที่จำเป็นต่อการแสดงผล + ชื่อ/LINE/ใบอนุญาตของตัวแทน (ตาม PDPA แสดงเท่าที่จำเป็น)
create or replace function public.get_shared_analysis(p_slug text)
returns table (
  input        jsonb,
  summary      jsonb,
  client_name  text,
  created_at   timestamptz,
  agent_name   text,
  agent_line   text,
  agent_license text
)
language sql security definer stable set search_path = public as $$
  select a.input, a.summary, a.client_name, a.created_at,
         ag.display_name, ag.line_id, ag.license_no
  from public.analyses a
  join public.agents ag on ag.id = a.agent_id
  where a.slug = p_slug
    and a.share_enabled = true
    and a.expires_at > now()
  limit 1;
$$;

revoke all on function public.get_shared_analysis(text) from public;
grant execute on function public.get_shared_analysis(text) to anon, authenticated;

-- ---------- รายการของตัวแทน (สรุปย่อ) ----------
create or replace view public.my_analyses as
  select id, slug, client_name, client_age, marital_status, created_at,
         (summary->>'overallScore')::int as score
  from public.analyses
  where agent_id = auth.uid();
