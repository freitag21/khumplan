-- คุ้มแพลน (KhumPlan) — migration 0003 (จากรอบ QA ของ Por)
-- รันใน Supabase Dashboard → SQL Editor → Run · รันซ้ำได้ปลอดภัย
--
-- 1) เก็บหลักฐานการยอมรับนโยบายเป็นคอลัมน์ในตาราง (แก้ไม่ได้จากฝั่งผู้ใช้)
-- 2) ปุ่ม "ปิดบัญชี" — RPC ลบบัญชีตัวเองพร้อมข้อมูลที่เกี่ยวข้อง

-- ═══════════ 1. หลักฐานการยอมรับนโยบาย ═══════════
alter table public.agents
  add column if not exists policy_accepted_at      timestamptz,
  add column if not exists policy_accepted_version text;

-- เก็บค่าตอนสมัคร จาก raw_user_meta_data
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

-- ห้ามแก้หลักฐานการยอมรับหลังบันทึกแล้ว (คงค่าเดิมเสมอเมื่อ update)
create or replace function public.freeze_policy_consent()
returns trigger language plpgsql as $$
begin
  if old.policy_accepted_at is not null then
    new.policy_accepted_at := old.policy_accepted_at;
  end if;
  if old.policy_accepted_version is not null then
    new.policy_accepted_version := old.policy_accepted_version;
  end if;
  return new;
end;
$$;

drop trigger if exists agents_freeze_consent on public.agents;
create trigger agents_freeze_consent
  before update on public.agents
  for each row execute function public.freeze_policy_consent();

-- ═══════════ 2. ปิดบัญชี ═══════════
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  -- ลบผู้ใช้ → cascade ไปที่ agents และ analyses ทั้งหมดของบัญชีนี้
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
