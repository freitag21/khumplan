import './styles/main.css';
import { analyze } from './lib/needs.js';
import { toNeedsInput } from './lib/questionnaire.js';
import { h, brand, BRAND, themeToggle, SUPPORT } from './ui/dom.js';
import { buildForm } from './ui/form.js';
import { renderResults } from './ui/results.js';
import { renderManha } from './ui/manha.js';
import { renderAuth, renderLanding, renderSupport, renderGuide, renderContact, renderTerms, renderPrivacy } from './ui/pages.js';
import { renderDashboard } from './ui/dashboard.js';
import { renderClientList, renderClientDetail } from './ui/clients.js';
import { hasSupabase } from './supabase.js';
import { getAgentProfile, signUp, signIn, sendPasswordReset, updatePassword, signOut, onAuthChange } from './auth.js';
import {
  saveAnalysis, updateAnalysis, deleteAnalysis, loadMyAnalysis, loadAnalysisBySlug,
  listMyAnalyses, updateAgentProfile, monthStats, deleteMyAccount,
  listClients, getClient, createClient, updateClient, deleteClient,
  addPolicy, updatePolicy, deletePolicy, linkAnalysis, listUnlinkedAnalyses, upcomingRenewals,
} from './store.js';

const root = document.getElementById('app');
let agent = null;
let lastForm = null;
let recovering = false;

async function init() {
  if (hasSupabase) {
    agent = await getAgentProfile();
    onAuthChange(async (user, event) => {
      if (event === 'PASSWORD_RECOVERY') { recovering = true; return nav('?view=auth&m=recover'); }
      agent = user ? await getAgentProfile() : null;
      if (event === 'SIGNED_IN' && !recovering) return nav('?view=dashboard');
      if (event === 'SIGNED_OUT') return nav('?');
      route();
    });
  }
  window.addEventListener('popstate', route);
  route();
}

const params = () => new URLSearchParams(location.search);
function nav(search) { history.pushState(null, '', search || location.pathname); route(); }

function route() {
  const p = params();
  if (p.get('a')) return showShared(p.get('a'));
  if (p.get('edit')) return showEdit(p.get('edit'));
  const view = p.get('view');
  if (view === 'landing') return showLanding();
  if (view === 'auth') return showAuth(p.get('m') || 'signin');
  if (view === 'dashboard') return showDashboard();
  if (view === 'clients') return showClients();
  if (view === 'client') return showClient(p.get('id'));
  if (view === 'support') return mount(renderSupport({ onBack: () => nav('?') }), { bare: true });
  if (view === 'guide') return mount(renderGuide({ onBack: () => nav('?'), onStart: () => nav('?view=quick') }));
  if (view === 'contact') return mount(renderContact({ onBack: () => nav('?'), onSupport: SUPPORT.enabled ? () => nav('?view=support') : null }));
  if (view === 'terms') return mount(renderTerms({ onBack: () => nav('?') }));
  if (view === 'privacy') return mount(renderPrivacy({ onBack: () => nav('?') }));
  if (view === 'quick') return showQuick();
  // หน้าแรก: ยังไม่ล็อกอิน → หน้า landing (ขายก่อน signup) · ล็อกอินแล้ว → เริ่มวิเคราะห์เลย
  if (hasSupabase && !agent?.id) return showLanding();
  return showForm();
}

function showLanding() {
  mount(renderLanding({
    onStart: () => nav('?view=quick'),
    onPreview: startSample,
    onSignup: () => nav('?view=auth&m=signup'),
    onLogin: () => nav('?view=auth'),
  }), { bare: true });
}

/* ---------- shell ---------- */

function mount(node, { bare = false, client = false } = {}) {
  root.innerHTML = '';
  if (client) {
    // หน้าที่ลูกค้าเห็น (ลิงก์แชร์) — ไม่มีเมนูตัวแทน, footer มีแค่บรรทัดกำกับ, ไม่มีลิงก์สนับสนุน/วิธีใช้
    root.append(h('div', { class: 'page' }, node),
      h('div', { class: 'footer ap-noprint' }, h('span', {}, `${BRAND} · ประมาณการเพื่อประกอบการวางแผน ไม่ใช่การเสนอขายกรมธรรม์`)));
  } else {
    if (!bare) root.append(topbar());
    root.append(h('div', { class: 'page' }, node), footer());
  }
  if (bare || client) {
    const t = themeToggle();
    t.classList.add('theme-toggle-float');
    root.append(t);
  }
  window.scrollTo({ top: 0 });
}

function topbar() {
  const right = [];
  if (hasSupabase && agent?.id) {
    right.push(h('a', { class: 'topbar-link', href: '?view=clients', onclick: (e) => { e.preventDefault(); nav('?view=clients'); } }, 'สมุดลูกค้า'));
    right.push(h('a', { class: 'topbar-link', href: '?view=dashboard', onclick: (e) => { e.preventDefault(); nav('?view=dashboard'); } }, 'แดชบอร์ด'));
    right.push(h('span', { class: 'topbar-user' }, agent.display_name || agent.email));
    right.push(h('button', { class: 'btn btn-secondary', style: 'padding:5px 11px;font-size:12.5px', onclick: async () => { await signOut(); } }, 'ออกจากระบบ'));
  } else if (hasSupabase) {
    right.push(h('button', { class: 'btn btn-secondary', style: 'padding:5px 11px;font-size:12.5px', onclick: () => nav('?view=auth') }, 'เข้าสู่ระบบ'));
  } else {
    right.push(h('span', { class: 'badge-offline' }, 'โหมดออฟไลน์'));
  }
  return h('div', { class: 'topbar' },
    h('a', { href: '?', style: 'text-decoration:none;color:inherit;display:contents', onclick: (e) => { e.preventDefault(); nav('?'); } }, brand(22)),
    h('a', { class: 'topbar-link topbar-nav', href: '?view=quick', onclick: (e) => { e.preventDefault(); nav('?view=quick'); } }, 'คัดกรอง MANHA'),
    h('a', { class: 'topbar-link topbar-nav', href: '?', onclick: (e) => { e.preventDefault(); nav('?'); } }, 'Protection Gap'),
    h('a', { class: 'topbar-link topbar-nav', href: '?view=landing', onclick: (e) => { e.preventDefault(); nav('?view=landing'); } }, 'เกี่ยวกับ'),
    h('a', { class: 'topbar-link topbar-nav', href: '?view=guide', onclick: (e) => { e.preventDefault(); nav('?view=guide'); } }, 'วิธีใช้'),
    ...right,
    themeToggle()
  );
}

const footerLink = (label, search) => h('a', { class: 'footer-link', href: search, onclick: (e) => { e.preventDefault(); nav(search); } }, label);

const footer = () => h('div', { class: 'footer ap-noprint' },
  h('span', {}, `${BRAND} · Module A — วิเคราะห์ความต้องการความคุ้มครอง (ประมาณการ ไม่ใช่คำแนะนำเฉพาะบุคคล)`),
  h('span', { class: 'footer-links' },
    footerLink('วิธีใช้', '?view=guide'),
    footerLink('ติดต่อเรา', '?view=contact'),
    footerLink('ข้อกำหนดการใช้งาน', '?view=terms'),
    footerLink('นโยบายความเป็นส่วนตัว', '?view=privacy'),
    SUPPORT.enabled
      ? h('a', { class: 'footer-support', href: '?view=support', onclick: (e) => { e.preventDefault(); nav('?view=support'); } }, '☕ สนับสนุนโปรเจค')
      : null));

/* ---------- auth ---------- */

function showAuth(mode) {
  const node = renderAuth({
    mode,
    onSwitch: (m) => nav('?view=auth' + (m === 'signin' ? '' : `&m=${m}`)),
    onBack: () => nav('?view=quick'),
    onSignUp: (creds) => signUp(creds),
    onSignIn: async (creds) => { await signIn(creds); /* onAuthChange จะพาไป dashboard */ },
    onReset: (email) => sendPasswordReset(email),
    onSetPassword: async (pw) => { await updatePassword(pw); recovering = false; nav('?view=dashboard'); },
  });
  mount(node, { bare: true });
}

/* ---------- dashboard ---------- */

async function showDashboard() {
  if (!hasSupabase) return mount(h('div', { class: 'card ap-g elev-sm', style: 'max-width:480px;margin:40px auto' },
    h('h2', { style: 'font-size:17px' }, 'แดชบอร์ดต้องเชื่อมต่อ Supabase'),
    h('p', { class: 'muted', style: 'font-size:13px' }, 'ตอนนี้แอปทำงานในโหมดออฟไลน์ (คำนวณได้ แต่บันทึก/ล็อกอินไม่ได้) — ตั้งค่า .env ให้ครบก่อนใช้แดชบอร์ด')));
  if (!agent?.id) return nav('?view=auth');
  root.innerHTML = '';
  root.append(topbar(), h('div', { class: 'page' }, h('p', { class: 'muted' }, 'กำลังโหลด…')), footer());
  const [analyses, stats, profile] = await Promise.all([listMyAnalyses(), monthStats(), getAgentProfile()]);
  agent = profile || agent;
  const node = renderDashboard({
    analyses, stats, agent,
    onNew: () => nav('?'),
    onOpen: (id) => nav(`?edit=${id}`),
    onDelete: (id) => deleteAnalysis(id),
    onSaveProfile: async (fields) => { agent = await updateAgentProfile(fields); },
    onSupport: () => nav('?view=support'),
    onClients: () => nav('?view=clients'),
    onDeleteAccount: async () => { await deleteMyAccount(); await signOut(); alert('ปิดบัญชีเรียบร้อยแล้ว'); },
  });
  root.innerHTML = '';
  root.append(topbar(), h('div', { class: 'page' }, node), footer());
  window.scrollTo({ top: 0 });
}

/* ---------- สมุดลูกค้า (Module B) ---------- */

function needsAgent() {
  if (!hasSupabase) { mount(h('div', { class: 'card ap-g elev-sm', style: 'max-width:480px;margin:40px auto' },
    h('h2', { style: 'font-size:17px' }, 'ต้องเชื่อมต่อ Supabase'),
    h('p', { class: 'muted', style: 'font-size:13px' }, 'โหมดออฟไลน์ใช้สมุดลูกค้าไม่ได้'))); return false; }
  if (!agent?.id) { nav('?view=auth'); return false; }
  return true;
}

function loadingShell() {
  root.innerHTML = '';
  root.append(topbar(), h('div', { class: 'page' }, h('p', { class: 'muted' }, 'กำลังโหลด…')), footer());
}

async function showClients() {
  if (!needsAgent()) return;
  loadingShell();
  try {
    const [clients, renewals] = await Promise.all([listClients(), upcomingRenewals(90)]);
    const node = renderClientList({
      clients, renewals,
      onOpen: (id) => nav(`?view=client&id=${id}`),
      onNew: () => promptNewClient(),
      onBack: () => nav('?view=dashboard'),
    });
    root.innerHTML = '';
    root.append(topbar(), h('div', { class: 'page' }, node), footer());
    window.scrollTo({ top: 0 });
  } catch (e) {
    mount(h('p', { class: 'muted' }, 'โหลดไม่สำเร็จ: ' + e.message));
  }
}

async function promptNewClient() {
  const name = prompt('ชื่อ-นามสกุลลูกค้า');
  if (name == null) return;
  const full_name = name.trim();
  if (!full_name) return;
  const ok = confirm(
    `เพิ่ม "${full_name}" เข้าสมุดลูกค้า\n\n` +
    'กด "ตกลง" เพื่อยืนยันว่าได้แจ้งวัตถุประสงค์และได้รับความยินยอมจากลูกค้าในการเก็บข้อมูลแล้ว (PDPA)');
  if (!ok) return;
  try {
    const { id } = await createClient({ full_name }, { consent: true });
    nav(`?view=client&id=${id}`);
  } catch (e) { alert('เพิ่มลูกค้าไม่สำเร็จ: ' + e.message); }
}

async function showClient(id) {
  if (!needsAgent()) return;
  if (!id) return nav('?view=clients');
  loadingShell();
  try {
    const [data, unlinked] = await Promise.all([getClient(id), listUnlinkedAnalyses()]);
    if (!data) return mount(h('p', { class: 'muted' }, 'ไม่พบลูกค้าคนนี้'));
    const node = renderClientDetail({
      data, unlinked,
      onBack: () => nav('?view=clients'),
      onSaveClient: (fields) => updateClient(id, fields),
      onDeleteClient: async () => { await deleteClient(id); nav('?view=clients'); },
      onAddPolicy: (fields) => addPolicy(id, fields),
      onUpdatePolicy: (pid, fields) => updatePolicy(pid, fields),
      onDeletePolicy: (pid) => deletePolicy(pid),
      onLinkAnalysis: (aid, cid) => linkAnalysis(aid, cid),
      onOpenAnalysis: (aid) => nav(`?edit=${aid}`),
      onNewAnalysis: () => nav('?'),
    });
    root.innerHTML = '';
    root.append(topbar(), h('div', { class: 'page' }, node), footer());
    window.scrollTo({ top: 0 });
  } catch (e) {
    mount(h('p', { class: 'muted' }, 'โหลดไม่สำเร็จ: ' + e.message));
  }
}

/* ---------- quick / form / results ---------- */

function showQuick() {
  root.innerHTML = '';
  root.append(topbar());
  root.append(h('div', { class: 'page page-narrow' }, renderManha({
    onContinue: (prefill) => showForm(prefill),
    onSkip: () => showForm(),
    onRestart: () => showQuick(),
  })), footer());
  window.scrollTo({ top: 0 });
}

function showForm(prefill, editId) {
  root.innerHTML = '';
  root.append(topbar());
  const page = h('div', { class: 'page page-narrow' });
  if (!editId) {
    page.append(h('div', { class: 'quick-banner ap-noprint' },
      h('div', { class: 'qb-text' }, h('b', {}, 'ยังไม่แน่ใจว่าควรลงเวลากับผู้มุ่งหวังคนนี้?'), ' คัดกรองเร็วด้วย MANHA ก่อน'),
      h('a', { class: 'btn btn-secondary', href: '?view=quick', onclick: (e) => { e.preventDefault(); nav('?view=quick'); } }, 'คัดกรอง MANHA')));
  }
  lastForm = buildForm({ onSubmit: (raw) => showResults(analyze(toNeedsInput(raw)), raw, editId) });
  if (prefill) lastForm.setValues(prefill);
  page.append(lastForm.element);
  root.append(page, footer());
  window.scrollTo({ top: 0 });
}

function startSample() {
  showForm();
  lastForm.loadSample();
  showResults(analyze(toNeedsInput(lastForm.getValues())), lastForm.getValues());
}

function showResults(result, rawForm, editId) {
  root.innerHTML = '';
  root.append(topbar());
  const canSave = hasSupabase && agent?.id;
  const node = renderResults(result, {
    agent,
    onEdit: () => showForm(rawForm, editId),
    onSave: canSave ? async () => {
      const ok = confirm(
        (editId ? 'ยืนยันการบันทึกทับผลเดิม\n\n' : 'ยืนยันการบันทึก\n\n') +
        'ระบบจะเก็บข้อมูลลูกค้า (รวมข้อมูลสุขภาพ/การเงิน) ลงระบบ' +
        (editId ? '' : ' และสร้างลิงก์แชร์ที่มีอายุ 90 วัน') + '\n\n' +
        'กด "ตกลง" เพื่อยืนยันว่าได้แจ้งวัตถุประสงค์และได้รับความยินยอมจากลูกค้าแล้ว (PDPA)');
      if (!ok) return;
      try {
        const { slug } = editId
          ? await updateAnalysis(editId, result.input, result.summary)
          : await saveAnalysis(result.input, result.summary, { consent: true });
        alert(editId ? 'บันทึกการแก้ไขแล้ว' : ('บันทึกแล้ว\nลิงก์แชร์ (90 วัน): ' + `${location.origin}${location.pathname}?a=${slug}`));
        nav('?view=dashboard');
      } catch (e) { alert('บันทึกไม่สำเร็จ: ' + e.message); }
    } : null,
    onCopyLink: null,
  });
  root.append(h('div', { class: 'page' }, node), footer());
  window.scrollTo({ top: 0 });
}

async function showEdit(id) {
  if (hasSupabase && !agent?.id) return nav('?view=auth');
  root.innerHTML = '';
  root.append(topbar(), h('div', { class: 'page' }, h('p', { class: 'muted' }, 'กำลังโหลด…')), footer());
  try {
    const row = await loadMyAnalysis(id);
    if (!row) return mount(h('p', { class: 'muted' }, 'ไม่พบผลวิเคราะห์นี้'));
    const result = analyze(row.input);
    showResults(result, formValuesFrom(row.input), id);
  } catch (e) {
    mount(h('p', { class: 'muted' }, 'โหลดไม่สำเร็จ: ' + e.message));
  }
}

async function showShared(slug) {
  root.innerHTML = '';
  root.append(h('div', { class: 'page' }, h('p', { class: 'muted' }, 'กำลังโหลด…')));
  try {
    const row = await loadAnalysisBySlug(slug);
    if (!row) return mount(h('p', { class: 'muted', style: 'text-align:center;margin:60px 0' }, 'ไม่พบผลวิเคราะห์นี้ หรือลิงก์หมดอายุแล้ว'), { client: true });
    mount(renderResults(analyze(row.input), { agent: row.agent || agent, readOnly: true }), { client: true });
  } catch (e) {
    mount(h('p', { class: 'muted' }, 'โหลดไม่สำเร็จ: ' + e.message), { client: true });
  }
}

/** แปลง needsInput (ที่บันทึกไว้) กลับเป็นค่าฟอร์ม — ฟอร์มรับ raw string ได้อยู่แล้ว, ส่ง input ตรง ๆ ก็พอ */
function formValuesFrom(input) {
  const v = { ...input };
  if (typeof v.spouseIncomeShare === 'number') v.spouseIncomeShare = Math.round(v.spouseIncomeShare * 100);
  v.hasDisabilityIncome = input.hasDisabilityIncome ? 'yes' : 'no';
  return v;
}

init();
