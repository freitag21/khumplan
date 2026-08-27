import { supabase, hasSupabase } from './supabase.js';
import { getUser } from './auth.js';

/**
 * บันทึกผลวิเคราะห์ลง Supabase — คืน { id, slug }
 * ต้องยืนยันว่าได้รับความยินยอมจากลูกค้าแล้ว (consent) ก่อนบันทึก
 */
export async function saveAnalysis(needsInput, summary, { consent = false } = {}) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase — บันทึกไม่ได้');
  if (!consent) throw new Error('กรุณายืนยันว่าได้รับความยินยอมจากลูกค้าก่อนบันทึก');
  const user = await getUser();
  if (!user) throw new Error('กรุณาล็อกอินก่อนบันทึก');

  const slug = crypto.randomUUID().slice(0, 8);
  const { data, error } = await supabase
    .from('analyses')
    .insert({
      agent_id: user.id,
      slug,
      client_name: needsInput.clientName || null,
      client_age: needsInput.age,
      client_sex: needsInput.sex,
      marital_status: needsInput.maritalStatus,
      occupation: needsInput.occupation || null,
      input: needsInput,
      summary,
      consent_confirmed: true,
    })
    .select('id, slug')
    .single();
  if (error) throw error;
  return data;
}

/** ดึงผลวิเคราะห์จาก slug ผ่าน RPC (หน้าแชร์ / อ่านอย่างเดียว) */
export async function loadAnalysisBySlug(slug) {
  if (!hasSupabase) return null;
  const { data, error } = await supabase.rpc('get_shared_analysis', { p_slug: slug });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    input: row.input,
    summary: row.summary,
    client_name: row.client_name,
    created_at: row.created_at,
    agent: row.agent_name
      ? { display_name: row.agent_name, line_id: row.agent_line, license_no: row.agent_license }
      : null,
  };
}

/** รายการผลวิเคราะห์ของตัวแทนคนปัจจุบัน */
export async function listMyAnalyses() {
  if (!hasSupabase) return [];
  const user = await getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('analyses')
    .select('id, slug, client_name, client_age, created_at, summary')
    .eq('agent_id', user.id)
    .order('created_at', { ascending: false });
  return data ?? [];
}
