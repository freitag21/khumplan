import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** true ถ้าตั้งค่า Supabase แล้ว (มีระบบล็อกอิน/บันทึก) */
export const hasSupabase = Boolean(url && key);

export const supabase = hasSupabase ? createClient(url, key) : null;
