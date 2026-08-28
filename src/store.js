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

/** slug ลิงก์แชร์ — url-safe ~22 ตัว (128-bit) เดา/ยิงสุ่มไม่ได้ */
function newSlug() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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

  const row = { agent_id: user.id, consent_confirmed: true, ...rowFromInput(needsInput, summary) };
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from('analyses')
      .insert({ ...row, slug: newSlug() })
      .select('id, slug')
      .single();
    if (!error) return data;
    if (error.code !== '23505') throw error; // 23505 = unique_violation (slug ชนกัน) → ลองใหม่
  }
  throw new Error('สร้างลิงก์แชร์ไม่สำเร็จ กรุณาลองอีกครั้ง');
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

/** ปิดบัญชี — ลบบัญชีและข้อมูลผลวิเคราะห์ทั้งหมดของตัวแทนคนนี้ (ถาวร) */
export async function deleteMyAccount() {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
}

/* ═══════════════ สมุดลูกค้า (Module B) ═══════════════ */

const CLIENT_FIELDS = ['full_name', 'nickname', 'birth_date', 'sex', 'phone', 'line_id', 'occupation', 'marital_status', 'note'];
const POLICY_FIELDS = ['kind', 'insurer', 'plan_name', 'sum_assured', 'premium', 'premium_freq', 'renewal_date', 'status', 'exclusions', 'note'];

function pick(fields, src) {
  const out = {};
  for (const k of fields) {
    let v = src[k];
    if (v === '' || v === undefined) v = null;
    if ((k === 'sum_assured' || k === 'premium') && v != null) { v = Number(v); if (!Number.isFinite(v)) v = null; }
    out[k] = v;
  }
  return out;
}

/** รายชื่อลูกค้าในสมุด + จำนวนกรมธรรม์ + วันครบกำหนดชำระที่ใกล้ที่สุด */
export async function listClients() {
  if (!hasSupabase) return [];
  const user = await getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('clients')
    .select('id, full_name, nickname, birth_date, phone, marital_status, updated_at, policies(id, status, renewal_date)')
    .eq('agent_id', user.id)
    .order('full_name');
  if (error) throw error;
  return (data ?? []).map((c) => {
    const pols = c.policies ?? [];
    const upcoming = pols
      .filter((p) => p.status === 'active' && p.renewal_date)
      .map((p) => p.renewal_date)
      .sort();
    return { ...c, policies: undefined, policyCount: pols.length, nextRenewal: upcoming[0] || null };
  });
}

/** ลูกค้า 1 คน + กรมธรรม์ทั้งหมด + ผลวิเคราะห์ที่ผูกไว้ */
export async function getClient(id) {
  if (!hasSupabase) return null;
  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!client) return null;
  const [{ data: policies }, { data: analyses }] = await Promise.all([
    supabase.from('policies').select('*').eq('client_id', id).order('created_at'),
    supabase.from('analyses').select('id, client_name, created_at, summary').eq('client_id', id).order('created_at', { ascending: false }),
  ]);
  return { client, policies: policies ?? [], analyses: analyses ?? [] };
}

/** สร้างลูกค้าใหม่ — ต้องยืนยันความยินยอม (PDPA) ก่อน */
export async function createClient(fields, { consent = false } = {}) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  if (!consent) throw new Error('กรุณายืนยันว่าได้รับความยินยอมจากลูกค้าก่อนบันทึกเข้าสมุด');
  const user = await getUser();
  if (!user) throw new Error('กรุณาเข้าสู่ระบบ');
  const row = {
    agent_id: user.id,
    ...pick(CLIENT_FIELDS, fields),
    pdpa_consent: true,
    pdpa_consent_at: new Date().toISOString(),
  };
  if (!row.full_name) throw new Error('กรุณากรอกชื่อลูกค้า');
  const { data, error } = await supabase.from('clients').insert(row).select('id').single();
  if (error) throw error;
  return data;
}

/** แก้ไขข้อมูลลูกค้า */
export async function updateClient(id, fields) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  const patch = pick(CLIENT_FIELDS, fields);
  if ('full_name' in patch && !patch.full_name) throw new Error('กรุณากรอกชื่อลูกค้า');
  const { error } = await supabase.from('clients').update(patch).eq('id', id);
  if (error) throw error;
}

/** ลบลูกค้า (กรมธรรม์ถูกลบตาม cascade · ผลวิเคราะห์ที่ผูกไว้จะถูกปลดผูก ไม่ถูกลบ) */
export async function deleteClient(id) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
}

/** เพิ่มกรมธรรม์ให้ลูกค้า */
export async function addPolicy(clientId, fields) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  const user = await getUser();
  if (!user) throw new Error('กรุณาเข้าสู่ระบบ');
  const row = { client_id: clientId, agent_id: user.id, ...pick(POLICY_FIELDS, fields) };
  const { data, error } = await supabase.from('policies').insert(row).select('*').single();
  if (error) throw error;
  return data;
}

/** แก้ไขกรมธรรม์ */
export async function updatePolicy(id, fields) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  const { data, error } = await supabase.from('policies').update(pick(POLICY_FIELDS, fields)).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

/** ลบกรมธรรม์ */
export async function deletePolicy(id) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  const { error } = await supabase.from('policies').delete().eq('id', id);
  if (error) throw error;
}

/** ผูก / ปลดผูก ผลวิเคราะห์เข้ากับลูกค้า */
export async function linkAnalysis(analysisId, clientId) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  const { error } = await supabase.from('analyses').update({ client_id: clientId }).eq('id', analysisId);
  if (error) throw error;
}

/** ผลวิเคราะห์ของตัวแทนที่ยังไม่ได้ผูกกับลูกค้าคนใด (สำหรับตัวเลือก "แนบผลวิเคราะห์") */
export async function listUnlinkedAnalyses() {
  if (!hasSupabase) return [];
  const user = await getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('analyses')
    .select('id, client_name, created_at')
    .eq('agent_id', user.id)
    .is('client_id', null)
    .order('created_at', { ascending: false });
  return data ?? [];
}

/** กรมธรรม์ที่ใกล้ครบกำหนดชำระ ภายใน N วัน (ทุกลูกค้า) — ฐานของ "เตือนต่ออายุ" */
export async function upcomingRenewals(days = 90) {
  if (!hasSupabase) return [];
  const user = await getUser();
  if (!user) return [];
  const until = new Date();
  until.setDate(until.getDate() + days);
  const { data, error } = await supabase
    .from('policies')
    .select('id, kind, insurer, plan_name, premium, premium_freq, renewal_date, client_id, clients(full_name, nickname)')
    .eq('agent_id', user.id)
    .eq('status', 'active')
    .not('renewal_date', 'is', null)
    .lte('renewal_date', until.toISOString().slice(0, 10))
    .order('renewal_date');
  if (error) throw error;
  return (data ?? []).map((p) => ({ ...p, client_name: p.clients?.full_name || '(ไม่ระบุ)', clients: undefined }));
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
