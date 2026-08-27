import './styles/main.css';
import { analyze } from './lib/needs.js';
import { toNeedsInput } from './lib/questionnaire.js';
import { h, brand, BRAND } from './ui/dom.js';
import { buildForm } from './ui/form.js';
import { renderResults } from './ui/results.js';
import { renderManha } from './ui/manha.js';
import { renderLogin, renderLanding } from './ui/pages.js';
import { hasSupabase } from './supabase.js';
import { getUser, getAgentProfile, signInWithEmail, signOut, onAuthChange } from './auth.js';
import { saveAnalysis, loadAnalysisBySlug } from './store.js';

const root = document.getElementById('app');
let agent = null;
let lastForm = null;

init();

async function init() {
  if (hasSupabase) {
    agent = await getAgentProfile();
    onAuthChange(async () => { agent = await getAgentProfile(); route(); });
  }
  window.addEventListener('popstate', route);
  route();
}

function params() { return new URLSearchParams(location.search); }
function nav(search) { history.pushState(null, '', search || location.pathname); route(); }

function route() {
  const p = params();
  if (p.get('a')) return showShared(p.get('a'));
  const view = p.get('view');
  if (view === 'landing') return mount(renderLanding({ onStart: () => nav('?view=quick'), onPreview: startSample, onLogin: () => nav('?view=login') }), { bare: true });
  if (view === 'login') return mount(renderLogin({ onSubmit: doSignIn, onBack: () => nav('?') }), { bare: true });
  if (view === 'quick') return showQuick();
  return showForm();
}

/* ---------- shell ---------- */

function mount(node, { bare = false } = {}) {
  root.innerHTML = '';
  if (!bare) root.append(topbar());
  const page = h('div', { class: 'page' + (bare ? '' : '') }, node);
  root.append(page, footer());
  window.scrollTo({ top: 0 });
}

function topbar() {
  const right = [];
  if (hasSupabase && agent?.display_name) {
    right.push(h('span', { class: 'topbar-link' }, agent.display_name));
    right.push(h('button', { class: 'btn btn-secondary', style: 'padding:5px 11px;font-size:12.5px', onclick: async () => { await signOut(); location.href = location.pathname; } }, 'ออกจากระบบ'));
  } else if (hasSupabase) {
    right.push(h('button', { class: 'btn btn-secondary', style: 'padding:5px 11px;font-size:12.5px', onclick: () => nav('?view=login') }, 'ล็อกอินตัวแทน'));
  } else {
    right.push(h('span', { class: 'badge-offline' }, 'โหมดออฟไลน์'));
  }
  return h('div', { class: 'topbar' },
    h('a', { href: '?', style: 'text-decoration:none;color:inherit;display:contents', onclick: (e) => { e.preventDefault(); nav('?'); } }, brand(22)),
    h('a', { class: 'topbar-link', href: '?view=quick', onclick: (e) => { e.preventDefault(); nav('?view=quick'); } }, 'คัดกรอง MANHA'),
    h('a', { class: 'topbar-link', href: '?', onclick: (e) => { e.preventDefault(); nav('?'); } }, 'Protection Gap'),
    h('a', { class: 'topbar-link', href: '?view=landing', onclick: (e) => { e.preventDefault(); nav('?view=landing'); } }, 'เกี่ยวกับ'),
    ...right
  );
}

function footer() {
  return h('div', { class: 'footer' }, `${BRAND} · Module A — วิเคราะห์ความต้องการความคุ้มครอง (ประมาณการ ไม่ใช่คำแนะนำเฉพาะบุคคล)`);
}

/* ---------- views ---------- */

function showQuick() {
  root.innerHTML = '';
  root.append(topbar());
  const node = renderManha({
    onContinue: (prefill) => showForm(prefill),
    onSkip: () => showForm(),
    onRestart: () => showQuick(),
  });
  root.append(h('div', { class: 'page page-narrow' }, node), footer());
  window.scrollTo({ top: 0 });
}

function showForm(prefill) {
  root.innerHTML = '';
  root.append(topbar());
  const page = h('div', { class: 'page page-narrow' });
  page.append(
    h('div', { class: 'quick-banner ap-noprint' },
      h('div', { class: 'qb-text' }, h('b', {}, 'ยังไม่แน่ใจว่าควรลงเวลากับผู้มุ่งหวังคนนี้?'), ' คัดกรองเร็วด้วย MANHA ก่อน'),
      h('a', { class: 'btn btn-secondary', href: '?view=quick', onclick: (e) => { e.preventDefault(); nav('?view=quick'); } }, 'คัดกรอง MANHA'))
  );
  lastForm = buildForm({
    onSubmit: (raw) => {
      const result = analyze(toNeedsInput(raw));
      showResults(result, raw);
    },
  });
  if (prefill) lastForm.setValues(prefill);
  page.append(lastForm.element);
  root.append(page, footer());
  window.scrollTo({ top: 0 });
}

function startSample() {
  showForm();
  lastForm.loadSample();
  // jump straight to result for a quick preview
  const result = analyze(toNeedsInput(lastForm.getValues()));
  showResults(result, lastForm.getValues());
}

function showResults(result, rawForm) {
  root.innerHTML = '';
  root.append(topbar());
  const node = renderResults(result, {
    agent,
    onEdit: () => showForm(rawForm),
    onSave: hasSupabase && agent?.id ? async () => {
      const ok = confirm(
        'ยืนยันการบันทึก\n\n' +
        'การบันทึกจะเก็บข้อมูลลูกค้า (รวมข้อมูลสุขภาพ/การเงิน) ลงระบบ ' +
        'และสร้างลิงก์แชร์ที่มีอายุ 90 วัน\n\n' +
        'กด "ตกลง" เพื่อยืนยันว่าคุณได้แจ้งวัตถุประสงค์และได้รับความยินยอมจากลูกค้าแล้ว (PDPA)'
      );
      if (!ok) return;
      try {
        const { slug } = await saveAnalysis(result.input, result.summary, { consent: true });
        const url = `${location.origin}${location.pathname}?a=${slug}`;
        history.replaceState(null, '', url);
        alert('บันทึกแล้ว\nลิงก์แชร์ (อายุ 90 วัน): ' + url);
      } catch (e) { alert('บันทึกไม่สำเร็จ: ' + e.message); }
    } : null,
  });
  root.append(h('div', { class: 'page' }, node), footer());
  window.scrollTo({ top: 0 });
}

async function showShared(slug) {
  root.innerHTML = '';
  root.append(topbar(), h('div', { class: 'page' }, h('p', { class: 'muted' }, 'กำลังโหลด…')), footer());
  try {
    const row = await loadAnalysisBySlug(slug);
    if (!row) return mount(h('p', { class: 'muted' }, 'ไม่พบผลวิเคราะห์นี้ หรือลิงก์หมดอายุแล้ว'));
    const result = analyze(row.input);
    mount(renderResults(result, { agent: row.agent || agent, readOnly: true }));
  } catch (e) {
    mount(h('p', { class: 'muted' }, 'โหลดไม่สำเร็จ: ' + e.message));
  }
}

/* ---------- auth ---------- */

async function doSignIn(email) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase (โหมดออฟไลน์)');
  await signInWithEmail(email);
}
