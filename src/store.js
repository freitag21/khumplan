import { supabase, hasSupabase } from './supabase.js';
import { getUser } from './auth.js';

function rowFromInput(needsInput, summary) {
  return {
    client_name: needsInput.clientName || null,
    client_age: needsInput.age,
    client_sex: needsInput.sex,
    marital_status: needsInput.maritalStatus,
    occupation: needsInput.occupation || null,
    input: needsInput,
    summary,
  };
}

/**
 * บันทึกผลวิเคราะห์ใหม่ — คืน { id, slug }
 * ต้องยืนยันว่าได้รับความยินยอมจากลูกค้าแล้ว (consent) ก่อนบันทึก
 */
export async function saveAnalysis(needsInput, summary, { consent = false } = {}) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase — บันทึกไม่ได้');
  if (!consent) throw new Error('กรุณายืนยันว่าได้รับความยินยอมจากลูกค้าก่อนบันทึก');
  const user = await getUser();
  if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนบันทึก');

  const { data, error } = await supabase
    .from('analyses')
    .insert({ agent_id: user.id, slug: crypto.randomUUID().slice(0, 8), consent_confirmed: true, ...rowFromInput(needsInput, summary) })
    .select('id, slug')
    .single();
  if (error) throw error;
  return data;
}

/** แก้ไขผลวิเคราะห์ที่บันทึกไว้แล้ว (ของตัวแทนเอง — RLS คุ้มครอง) */
export async function updateAnalysis(id, needsInput, summary) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  const { data, error } = await supabase
    .from('analyses')
    .update(rowFromInput(needsInput, summary))
    .eq('id', id)
    .select('id, slug')
    .single();
  if (error) throw error;
  return data;
}

/** ลบผลวิเคราะห์ */
export async function deleteAnalysis(id) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  const { error } = await supabase.from('analyses').delete().eq('id', id);
  if (error) throw error;
}

/** ดึงผลวิเคราะห์ของตัวเอง (แก้ไขได้) ด้วย id */
export async function loadMyAnalysis(id) {
  if (!hasSupabase) return null;
  const { data, error } = await supabase
    .from('analyses')
    .select('id, slug, input, summary, client_name, created_at, share_enabled, expires_at')
    .eq('id', id)
    .maybeSingle();
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
    .select('id, slug, client_name, client_age, marital_status, created_at, summary')
    .eq('agent_id', user.id)
    .order('created_at', { ascending: false });
  return data ?? [];
}

/** อัปเดตโปรไฟล์ตัวแทน (ชื่อ, LINE, บริษัท, เลขใบอนุญาต) */
export async function updateAgentProfile(fields) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  const user = await getUser();
  if (!user) throw new Error('กรุณาเข้าสู่ระบบ');
  const patch = {
    id: user.id,
    email: user.email,
    display_name: fields.display_name ?? null,
    line_id: fields.line_id ?? null,
    company: fields.company ?? null,
    license_no: fields.license_no ?? null,
  };
  const { data, error } = await supabase.from('agents').upsert(patch).select('*').single();
  if (error) throw error;
  return data;
}

/** สถิติเดือนนี้ */
export async function monthStats() {
  if (!hasSupabase) return null;
  const user = await getUser();
  if (!user) return null;
  const since = new Date();
  since.setDate(1);
  since.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from('analyses')
    .select('summary, created_at')
    .eq('agent_id', user.id)
    .gte('created_at', since.toISOString());
  const rows = data ?? [];
  const scores = rows.map((r) => Number(r.summary?.overallScore)).filter(Number.isFinite);
  return {
    created: rows.length,
    avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
  };
}
