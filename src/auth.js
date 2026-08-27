import { supabase, hasSupabase } from './supabase.js';

/** ผู้ใช้ปัจจุบัน (หรือ null) */
export async function getUser() {
  if (!hasSupabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

/** โปรไฟล์ตัวแทน (ตาราง agents) ของผู้ใช้ปัจจุบัน */
export async function getAgentProfile() {
  if (!hasSupabase) return null;
  const user = await getUser();
  if (!user) return null;
  const { data } = await supabase.from('agents').select('*').eq('id', user.id).maybeSingle();
  return data ?? { id: user.id, email: user.email, display_name: user.user_metadata?.display_name || '' };
}

/** เวอร์ชันของข้อกำหนด/นโยบายที่ตัวแทนยอมรับตอนสมัคร — พ.ศ. ISO · อัปเดตเมื่อแก้เอกสาร (ที่นี่ที่เดียว) */
export const POLICY_VERSION = '2569-08-27';

/** สมัครสมาชิกด้วยอีเมล + รหัสผ่าน — คืน { needsConfirm } */
export async function signUp({ email, password, displayName }) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName || '',
        policy_accepted_version: POLICY_VERSION,
        policy_accepted_at: new Date().toISOString(),
      },
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw translate(error);
  return { needsConfirm: !data.session };
}

/** เข้าสู่ระบบด้วยอีเมล + รหัสผ่าน */
export async function signIn({ email, password }) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw translate(error);
}

/** ส่งอีเมลรีเซ็ตรหัสผ่าน */
export async function sendPasswordReset(email) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  if (error) throw translate(error);
}

/** ตั้งรหัสผ่านใหม่ (ระหว่าง recovery หรือหลังล็อกอิน) */
export async function updatePassword(password) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw translate(error);
}

export async function signOut() {
  if (!hasSupabase) return;
  await supabase.auth.signOut();
}

/** cb(user, event) — event เช่น 'SIGNED_IN', 'SIGNED_OUT', 'PASSWORD_RECOVERY' */
export function onAuthChange(cb) {
  if (!hasSupabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => cb(session?.user ?? null, event));
  return () => data.subscription.unsubscribe();
}

function translate(error) {
  const m = (error && error.message) || '';
  if (/Invalid login credentials/i.test(m)) return new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  if (/already registered|already been registered|User already/i.test(m)) return new Error('อีเมลนี้สมัครไว้แล้ว — ลองเข้าสู่ระบบ');
  if (/Password should be at least/i.test(m)) return new Error('รหัสผ่านสั้นเกินไป (อย่างน้อย 6 ตัวอักษร)');
  if (/Email not confirmed/i.test(m)) return new Error('ยังไม่ได้ยืนยันอีเมล — ตรวจสอบกล่องจดหมาย');
  if (/rate limit|too many|after \d+ seconds/i.test(m)) return new Error('ลองบ่อยเกินไป รอสักครู่แล้วลองใหม่');
  return new Error(m || 'เกิดข้อผิดพลาด');
}
