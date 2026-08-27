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
  return data ?? { id: user.id, email: user.email };
}

/** ส่งลิงก์ล็อกอิน (magic link) ไปที่อีเมล */
export async function signInWithEmail(email) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut() {
  if (!hasSupabase) return;
  await supabase.auth.signOut();
}

export function onAuthChange(cb) {
  if (!hasSupabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(session?.user ?? null));
  return () => data.subscription.unsubscribe();
}
