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

const CLIENT_FIELDS = ['full_name', 'nickname', 'birth_date', 'sex', 'phone', 'line_id', 'occupation', 'marital_status', 'note', 'referred_by', 'orphan'];
const POLICY_FIELDS = [
  'kind', 'insurer', 'plan_name', 'sum_assured', 'premium', 'premium_freq', 'renewal_date', 'status', 'exclusions', 'note',
  'policy_no', 'parent_policy_id', 'health_room_daily', 'health_annual', 'has_copay', 'ci_sum',
  'payment_method', 'start_date', 'paid_to_year', 'beneficiary',
];
const NUMERIC_FIELDS = new Set(['sum_assured', 'premium', 'health_room_daily', 'health_annual', 'ci_sum', 'paid_to_year']);
const BOOL_FIELDS = new Set(['has_copay', 'orphan']);

function pick(fields, src) {
  const out = {};
  for (const k of fields) {
    let v = src[k];
    if (v === '' || v === undefined) v = null;
    if (BOOL_FIELDS.has(k)) { out[k] = v === true || v === 'true' || v === 'on'; continue; }
    if (NUMERIC_FIELDS.has(k) && v != null) { v = Number(v); if (!Number.isFinite(v)) v = null; }
    out[k] = v;
  }
  return out;
}

/**
 * รวมความคุ้มครองที่ลูกค้าถืออยู่ (active) → ค่าฟอร์ม Protection Gap
 * ทุนชีวิต/CI/PA รวมกัน · ค่าห้อง+เหมาจ่ายสุขภาพเอาค่าสูงสุด · แยกส่วนตัว/กลุ่ม
 */
export function coverageFromPolicies(policies = []) {
  const out = {};
  const add = (k, v) => { const n = Number(v); if (Number.isFinite(n) && n > 0) out[k] = (out[k] || 0) + n; };
  const max = (k, v) => { const n = Number(v); if (Number.isFinite(n) && n > 0) out[k] = Math.max(out[k] || 0, n); };
  for (const p of policies) {
    if (p.status && p.status !== 'active') continue;
    const grp = p.kind === 'group';
    if (p.kind === 'life' || p.kind === 'unitlinked') add('existingLifeSum', p.sum_assured);
    else if (p.kind === 'group') add('groupLifeSum', p.sum_assured);
    if (p.kind === 'ci') add(grp ? 'groupCiSum' : 'existingCiSum', p.ci_sum || p.sum_assured);
    else if (p.ci_sum) add(grp ? 'groupCiSum' : 'existingCiSum', p.ci_sum);
    if (p.kind === 'pa') add('existingPaSum', p.sum_assured);
    if (p.kind === 'disability') add(grp ? 'groupTpdSum' : 'existingTpdSum', p.sum_assured);
    if (p.kind === 'health' || p.kind === 'group') {
      max(grp ? 'groupHealthRoom' : 'existingHealthRoom', p.health_room_daily);
      max(grp ? 'groupHealthAnnual' : 'existingHealthAnnual', p.health_annual);
      if (!grp && p.has_copay) out.existingHealthCopay = true;
    }
  }
  if (out.groupCiSum) out.groupHasCi = true;
  return out;
}

/** รายชื่อลูกค้าในสมุด + จำนวนกรมธรรม์ + วันครบกำหนดชำระที่ใกล้ที่สุด */
export async function listClients() {
  if (!hasSupabase) return [];
  const user = await getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('clients')
    .select('id, full_name, nickname, birth_date, phone, marital_status, stage, updated_at, policies(id, status, renewal_date)')
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
  const [{ data: policies }, { data: analyses }, { data: interactions }] = await Promise.all([
    supabase.from('policies').select('*').eq('client_id', id).order('created_at'),
    supabase.from('analyses').select('id, client_name, created_at, summary').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('interactions').select('id, channel, outcome, occurred_on').eq('client_id', id).order('occurred_on', { ascending: false }).order('created_at', { ascending: false }),
  ]);
  return { client, policies: policies ?? [], analyses: analyses ?? [], interactions: interactions ?? [] };
}

/** สร้างลูกค้าใหม่ — ต้องยืนยันความยินยอม (PDPA) ก่อน · stage: 'customer' | 'prospect' */
export async function createClient(fields, { consent = false, stage = 'customer', consentVersion = null } = {}) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  if (!consent) throw new Error('กรุณายืนยันว่าได้รับความยินยอมจากลูกค้าก่อนบันทึกเข้าสมุด');
  const user = await getUser();
  if (!user) throw new Error('กรุณาเข้าสู่ระบบ');
  const row = {
    agent_id: user.id,
    ...pick(CLIENT_FIELDS, fields),
    stage: stage === 'prospect' ? 'prospect' : 'customer',
    pdpa_consent: true,
    pdpa_consent_at: new Date().toISOString(),
    consent_version: consentVersion,
  };
  if (!row.full_name) throw new Error('กรุณากรอกชื่อลูกค้า');
  const { data, error } = await supabase.from('clients').insert(row).select('id').single();
  if (error) throw error;
  return data;
}

/** เปลี่ยนสถานะผู้มุ่งหวัง → ลูกค้า */
export async function setClientStage(id, stage) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  const { error } = await supabase.from('clients').update({ stage: stage === 'prospect' ? 'prospect' : 'customer' }).eq('id', id);
  if (error) throw error;
}

/** แก้ไขข้อมูลลูกค้า */
export async function updateClient(id, fields) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  const patch = pick(CLIENT_FIELDS, fields);
  if ('full_name' in patch && !patch.full_name) throw new Error('กรุณากรอกชื่อลูกค้า');
  const { error } = await supabase.from('clients').update(patch).eq('id', id);
  if (error) throw error;
}

/**
 * ลบลูกค้า (กรมธรรม์ + รายการติดตาม + บันทึกการติดต่อ ถูกลบตาม cascade)
 * alsoAnalyses=true → ลบผลวิเคราะห์ที่ผูกไว้ด้วย (ค่าเริ่มต้นในหน้าจอ) · false → แค่ปลดผูก
 */
export async function deleteClient(id, { alsoAnalyses = false } = {}) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  if (alsoAnalyses) {
    const { error: e1 } = await supabase.from('analyses').delete().eq('client_id', id);
    if (e1) throw e1;
  }
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

/* ═══════════════ งานติดตาม (follow-ups) ═══════════════ */

const REMINDER_FIELDS = ['client_id', 'kind', 'title', 'detail', 'due_date'];

/** รายการติดตามที่ยังไม่เสร็จ (หรือทั้งหมด) + ชื่อลูกค้า */
export async function listReminders({ includeDone = false } = {}) {
  if (!hasSupabase) return [];
  const user = await getUser();
  if (!user) return [];
  let q = supabase
    .from('reminders')
    .select('id, client_id, kind, title, detail, due_date, done, done_at, clients(full_name, phone, line_id)')
    .eq('agent_id', user.id)
    .order('due_date');
  if (!includeDone) q = q.eq('done', false);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r,
    client_name: r.clients?.full_name || null,
    client_phone: r.clients?.phone || null,
    client_line: r.clients?.line_id || null,
    clients: undefined,
  }));
}

export async function createReminder(fields) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  const user = await getUser();
  if (!user) throw new Error('กรุณาเข้าสู่ระบบ');
  const row = { agent_id: user.id, ...pick(REMINDER_FIELDS, fields) };
  if (!row.title) throw new Error('กรุณากรอกหัวข้อ');
  if (!row.due_date) throw new Error('กรุณาระบุวันครบกำหนด');
  const { data, error } = await supabase.from('reminders').insert(row).select('*').single();
  if (error) throw error;
  return data;
}

export async function setReminderDone(id, done) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  const { error } = await supabase.from('reminders')
    .update({ done: !!done, done_at: done ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw error;
}

/** เลื่อนวันครบกำหนดของรายการติดตาม ไป N วัน */
export async function snoozeReminder(id, days) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  const d = new Date();
  d.setDate(d.getDate() + Number(days || 7));
  const { error } = await supabase.from('reminders')
    .update({ due_date: d.toISOString().slice(0, 10), done: false, done_at: null })
    .eq('id', id);
  if (error) throw error;
  return d.toISOString().slice(0, 10);
}

export async function deleteReminder(id) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  const { error } = await supabase.from('reminders').delete().eq('id', id);
  if (error) throw error;
}

/** ปิดธง resale ของลูกค้าคนหนึ่ง — เก็บเป็น reminder แบบ done (tombstone · กันธงเด้งซ้ำ) */
export async function dismissResale(clientId, months = 6) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  const user = await getUser();
  if (!user) throw new Error('กรุณาเข้าสู่ระบบ');
  const due = new Date(); due.setMonth(due.getMonth() + Number(months || 6));
  const { error } = await supabase.from('reminders').insert({
    agent_id: user.id, client_id: clientId, kind: 'resale',
    title: 'ปิดธงเสนอเพิ่มไว้ชั่วคราว', due_date: due.toISOString().slice(0, 10),
    done: true, done_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/* ═══════════════ บันทึกการติดต่อ (contact log) ═══════════════ */

export async function listInteractions(clientId) {
  if (!hasSupabase) return [];
  const { data, error } = await supabase
    .from('interactions')
    .select('id, channel, outcome, occurred_on, created_at')
    .eq('client_id', clientId)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addInteraction({ client_id, channel = 'call', outcome, occurred_on }) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  const user = await getUser();
  if (!user) throw new Error('กรุณาเข้าสู่ระบบ');
  if (!outcome || !outcome.trim()) throw new Error('กรุณาบันทึกผลการติดต่อ');
  const row = {
    agent_id: user.id, client_id, channel,
    outcome: outcome.trim(),
    occurred_on: occurred_on || new Date().toISOString().slice(0, 10),
  };
  const { data, error } = await supabase.from('interactions').insert(row).select('*').single();
  if (error) throw error;
  return data;
}

const FREQ_MONTHS = { year: 12, half: 6, quarter: 3, month: 1 };

/** "ชำระเบี้ยแล้ว" — เลื่อน renewal_date ไปงวดถัดไปตาม premium_freq */
export async function markPremiumPaid(policyId) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
  const { data: p, error: e1 } = await supabase
    .from('policies').select('renewal_date, premium_freq').eq('id', policyId).single();
  if (e1) throw e1;
  let next = null;
  if (p.premium_freq === 'single') {
    next = null; // ชำระครั้งเดียว — ไม่มีงวดถัดไป
  } else {
    const base = p.renewal_date ? new Date(p.renewal_date + 'T00:00:00') : new Date();
    const months = FREQ_MONTHS[p.premium_freq] || 12;
    base.setMonth(base.getMonth() + months);
    next = base.toISOString().slice(0, 10);
  }
  const { error } = await supabase.from('policies').update({ renewal_date: next }).eq('id', policyId);
  if (error) throw error;
  return next;
}

/** ลูกค้าที่วันเกิดอยู่ในเดือนนี้ */
export async function birthdaysThisMonth() {
  if (!hasSupabase) return [];
  const user = await getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('clients')
    .select('id, full_name, nickname, birth_date')
    .eq('agent_id', user.id)
    .not('birth_date', 'is', null);
  const mm = new Date().getMonth() + 1;
  return (data ?? [])
    .filter((c) => Number((c.birth_date || '').slice(5, 7)) === mm)
    .map((c) => ({ ...c, day: Number(c.birth_date.slice(8, 10)) }))
    .sort((a, b) => a.day - b.day);
}

/**
 * ผู้มุ่งหวังที่เงียบนาน — สร้างเกิน N เดือน ไม่มีบันทึกการติดต่อ และไม่มีงานติดตามค้าง
 * (PDPA: ไม่เก็บข้อมูลเกินความจำเป็น — ควรลบหรือขอความยินยอมใหม่)
 */
export async function staleProspects(months = 24) {
  if (!hasSupabase) return [];
  const user = await getUser();
  if (!user) return [];
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - Number(months || 24));
  const { data, error } = await supabase
    .from('clients')
    .select('id, full_name, nickname, created_at, interactions(id), reminders(id, done)')
    .eq('agent_id', user.id)
    .eq('stage', 'prospect')
    .lt('created_at', cutoff.toISOString());
  if (error) throw error;
  return (data ?? [])
    .filter((c) => !(c.interactions ?? []).length && !(c.reminders ?? []).some((r) => !r.done))
    .map((c) => ({ id: c.id, full_name: c.full_name, nickname: c.nickname, created_at: c.created_at }));
}

/* หมวด Protection Gap → ประเภทกรมธรรม์ส่วนตัวที่ถือว่าครอบคลุม (ไม่รวม 'group' — สวัสดิการหายเมื่อออกจากงาน) */
const GAP_COVER = {
  life: ['life', 'unitlinked'],
  health: ['health'],
  ci: ['ci'],
  disability: ['disability'],
  retirement: ['annuity', 'savings'],
  education: ['savings', 'annuity'],
};
/* หมวดที่ประกันกลุ่มพอจะรองรับได้ชั่วคราว (ทุพพลภาพไม่รวม — พ้นสภาพพนักงานแน่นอน) */
const GROUP_COVER = { life: true, health: true, ci: true };
const GAP_LABEL = {
  life: 'ทุนประกันชีวิต', health: 'ประกันสุขภาพ', ci: 'โรคร้ายแรง',
  disability: 'ทุพพลภาพ / คุ้มครองรายได้', retirement: 'เงินออมเพื่อเกษียณ', education: 'ทุนการศึกษาบุตร',
};
const STALE_DAYS = 400;

/**
 * ธง resale จากผลวิเคราะห์ล่าสุดที่ผูกกับลูกค้า
 * คืน [{ client_id, client_name, analysisDate, stale, gaps:[label], groupOnly:[label], underinsured:[label] }]
 *  - gaps         = หมวดที่มีช่องว่าง และไม่มีกรมธรรม์ส่วนตัวรองรับเลย
 *  - groupOnly    = หมวดที่มีช่องว่าง มีแต่ประกันกลุ่มรองรับ (จะหายเมื่อออกจากงาน)
 *  - underinsured = หมวดที่มีกรมธรรม์แล้วแต่ "มี" < 60% ของ "ควรมี"
 *  - stale        = ผลวิเคราะห์เก่ากว่า ~13 เดือน → ควรทบทวนแผนประจำปี
 */
export async function resaleOpportunities() {
  if (!hasSupabase) return [];
  const user = await getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('clients')
    .select('id, full_name, policies(kind, status), analyses(summary, created_at)')
    .eq('agent_id', user.id);
  if (error) throw error;
  const now = Date.now();
  const out = [];
  for (const c of data ?? []) {
    const ana = (c.analyses ?? []).slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];
    const sum = ana?.summary;
    const order = sum?.priorityOrder;
    if (!Array.isArray(order) || !order.length) continue;

    const active = (c.policies ?? []).filter((p) => p.status === 'active');
    const held = new Set(active.map((p) => p.kind));
    const hasGroup = held.has('group');
    const gapByKey = Object.fromEntries((sum.gapDetail || []).map((d) => [d.key, d]));

    const gaps = [], groupOnly = [], underinsured = [];
    for (const k of order) {
      if (!GAP_COVER[k]) continue;
      const coveredPersonal = GAP_COVER[k].some((kind) => held.has(kind));
      if (coveredPersonal) {
        const d = gapByKey[k];
        if (d && d.need > 0 && d.have < 0.6 * d.need) underinsured.push(GAP_LABEL[k] || k);
      } else if (hasGroup && GROUP_COVER[k]) {
        groupOnly.push(GAP_LABEL[k] || k);
      } else {
        gaps.push(GAP_LABEL[k] || k);
      }
    }

    const ageDays = ana.created_at ? (now - new Date(ana.created_at).getTime()) / 86400000 : 0;
    const stale = ageDays > STALE_DAYS;
    if (gaps.length || groupOnly.length || underinsured.length || stale) {
      out.push({ client_id: c.id, client_name: c.full_name, analysisDate: ana.created_at, stale, gaps, groupOnly, underinsured });
    }
  }
  return out;
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
