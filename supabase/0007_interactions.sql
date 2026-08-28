-- คุ้มแพลน (KhumPlan) — migration 0007: บันทึกการติดต่อ (contact log)
-- วางใน Supabase Dashboard → SQL Editor → Run · รันซ้ำได้ ปลอดภัย
--
-- ที่มา: รีวิวของ Win — "ไม่มีบันทึกการติดต่อแบบมีวันที่" คือช่องโหว่เชิงโครงสร้าง
--   ตอนติ๊กงานติดตามว่าเสร็จ → บันทึกผลเป็น log 1 บรรทัดพร้อมวันที่
--   ได้ทั้ง ประวัติการคุย · กิจกรรมต่อเนื่อง · วัตถุดิบของแดชบอร์ดหัวหน้าทีม

create table if not exists public.interactions (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid not null references public.agents (id) on delete cascade,
  client_id   uuid not null references public.clients (id) on delete cascade,
  channel     text not null default 'call'
                check (channel in ('call', 'line', 'meet', 'other')),
  outcome     text not null,
  occurred_on date not null default current_date,
  created_at  timestamptz not null default now()
);

create index if not exists interactions_client_idx on public.interactions (client_id, occurred_on desc);

alter table public.interactions enable row level security;

drop policy if exists "interactions owner all" on public.interactions;
create policy "interactions owner all" on public.interactions
  for all using (auth.uid() = agent_id) with check (auth.uid() = agent_id);
