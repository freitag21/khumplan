-- คุ้มแพลน (KhumPlan) — เปลี่ยนมาใช้ อีเมล + รหัสผ่าน
-- ให้ trigger เก็บ display_name จาก metadata ตอนสมัคร
-- (ตั้งค่าใน Supabase Dashboard: Authentication > Providers > Email → เปิด "Confirm email" ตามต้องการ,
--  ปิด "Enable magic link" ได้ถ้าไม่ใช้)

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.agents (id, email, display_name)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), '')
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.agents.display_name, excluded.display_name);
  return new;
end;
$$;

-- (trigger on_auth_user_created ถูกสร้างไว้แล้วใน 0001 — ใช้ฟังก์ชันเวอร์ชันใหม่นี้อัตโนมัติ)
