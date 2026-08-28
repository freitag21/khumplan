-- คุ้มแพลน (KhumPlan) — migration 0005: งานติดตาม (follow-ups)
-- วางใน Supabase Dashboard → SQL Editor → Run · รันซ้ำได้ ปลอดภัย
--
-- เพิ่ม:
--   clients.stage       — 'prospect' (ผู้มุ่งหวัง จาก MANHA) หรือ 'customer'
--   public.reminders    — รายการติดตาม: nurture / resale / ต่ออายุ / วันเกิด / กำหนดเอง

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
