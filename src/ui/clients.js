import { h, icon, ICONS } from './dom.js';

/* ─────────── ป้ายภาษาไทย ─────────── */
export const KIND_LABEL = {
  life: 'ชีวิต', health: 'สุขภาพ', ci: 'โรคร้ายแรง', pa: 'อุบัติเหตุ (PA)',
  annuity: 'บำนาญ', savings: 'สะสมทรัพย์', unitlinked: 'ยูนิตลิงก์', group: 'ประกันกลุ่ม', other: 'อื่น ๆ',
};
const STATUS_LABEL = {
  active: 'มีผลบังคับ', lapsed: 'ขาดอายุ', paidup: 'ใช้เงินสำเร็จ (paid-up)',
  matured: 'ครบสัญญา', surrendered: 'เวนคืน', pending: 'รอพิจารณารับประกัน',
};
const FREQ_LABEL = { year: 'รายปี', half: 'ราย 6 เดือน', quarter: 'รายไตรมาส', month: 'รายเดือน', single: 'ชำระครั้งเดียว' };
const MARITAL_LABEL = { single: 'โสด', married: 'สมรส', divorced: 'หย่า', widowed: 'หม้าย', single_parent: 'เลี้ยงบุตรคนเดียว' };
const PAY_LABEL = { self: 'จ่ายเอง', bank: 'หักบัญชีธนาคาร', card: 'หักบัตรเครดิต', payroll: 'หักเงินเดือน', other: 'อื่น ๆ' };
/* หมวดที่วัดความคุ้มครองด้วยค่าห้อง/เหมาจ่าย ไม่ใช่ "ทุน" */
const HEALTH_KINDS = new Set(['health', 'group']);

const THMONTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const g = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v)).toLocaleString('th-TH') : null);
const thDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getDate()} ${THMONTH[d.getMonth()]} ${d.getFullYear() + 543}`;
};
const daysUntil = (iso) => Math.round((new Date(iso + 'T00:00:00') - new Date().setHours(0, 0, 0, 0)) / 86400000);

function field(label, input, hint) {
  return h('div', { class: 'field ap-f', style: 'margin-bottom:10px' },
    h('label', {}, label), input, hint ? h('div', { class: 'auth-fine' }, hint) : null);
}
function input(value, attrs = {}) {
  return h('input', { class: 'input', value: value ?? '', ...attrs });
}
function select(value, options, attrs = {}) {
  const el = h('select', { class: 'input', ...attrs },
    ...options.map(([v, label]) => h('option', { value: v }, label)));
  el.value = value ?? '';
  return el;
}

/* ═══════════════ รายชื่อลูกค้า ═══════════════ */

/**
 * @param {{clients:any[], renewals:any[], onOpen:(id)=>void, onNew:()=>void, onBack:()=>void}} opts
 */
export function renderClientList(opts = {}) {
  let clients = opts.clients || [];
  let filter = 'all'; // all | customer | prospect
  let sortBy = 'name'; // name | updated
  const listWrap = h('div', { class: 'dash-list' });
  const search = h('input', { class: 'input', placeholder: 'ค้นหาชื่อ / ชื่อเล่น', style: 'width:200px', oninput: renderRows });

  const chip = (key, label) => h('button', {
    class: 'fu-chip' + (filter === key ? ' on' : ''),
    onclick: () => { filter = key; chipRow.querySelectorAll('.fu-chip').forEach((b, i) => b.classList.toggle('on', ['all', 'customer', 'prospect'][i] === key)); renderRows(); },
  }, label);
  const chipRow = h('div', { class: 'fu-chips' });
  const sortSel = h('select', { class: 'input', style: 'width:150px', onchange: () => { sortBy = sortSel.value; renderRows(); } },
    h('option', { value: 'name' }, 'เรียงตามชื่อ'), h('option', { value: 'updated' }, 'อัปเดตล่าสุด'));

  function renderRows() {
    const q = search.value.trim().toLowerCase();
    let rows = clients.filter((c) => (filter === 'all' || (c.stage || 'customer') === filter)
      && (!q || (c.full_name || '').toLowerCase().includes(q) || (c.nickname || '').toLowerCase().includes(q)));
    rows = rows.slice().sort((a, b) => sortBy === 'updated'
      ? (b.updated_at || '').localeCompare(a.updated_at || '')
      : (a.full_name || '').localeCompare(b.full_name || '', 'th'));
    listWrap.innerHTML = '';
    if (!rows.length) {
      listWrap.append(h('div', { class: 'dash-empty' },
        clients.length ? 'ไม่พบลูกค้าที่ค้นหา' : 'ยังไม่มีลูกค้าในสมุด — กด "เพิ่มลูกค้า" เพื่อเริ่ม'));
      return;
    }
    listWrap.append(h('div', { class: 'dash-row client-row dash-head' },
      h('span', {}, 'ลูกค้า'), h('span', { class: 'r' }, 'กรมธรรม์'), h('span', { class: 'r' }, 'ครบกำหนดถัดไป'), h('span', {})));
    rows.forEach((c) => {
      const d = c.nextRenewal ? daysUntil(c.nextRenewal) : null;
      const renewCls = d == null ? 'muted' : d < 0 ? 'renew-over' : d <= 30 ? 'renew-soon' : 'muted';
      listWrap.append(h('div', { class: 'dash-row client-row' },
        h('div', { class: 'dr-name', onclick: () => opts.onOpen?.(c.id) },
          h('div', { class: 'nm' }, c.full_name, c.nickname ? h('span', { class: 'muted' }, ` (${c.nickname})`) : null,
            c.stage === 'prospect' ? h('span', { class: 'tag p-info', style: 'margin-left:6px' }, 'ผู้มุ่งหวัง') : null),
          h('div', { class: 'sub' }, [MARITAL_LABEL[c.marital_status], c.phone].filter(Boolean).join(' · '))),
        h('span', { class: 'r n muted' }, c.policyCount || 0),
        h('span', { class: `r ${renewCls}`, style: 'font-size:12px' },
          c.nextRenewal ? (thDate(c.nextRenewal) + (d < 0 ? ' · เกิน' : d <= 30 ? ` · ${d} วัน` : '')) : '—'),
        h('div', { class: 'dr-actions' },
          h('button', { class: 'icon-btn', title: 'เปิด', onclick: () => opts.onOpen?.(c.id) },
            icon(ICONS.chevron, { size: 14, stroke: 'var(--ap-ink2)' })))));
    });
  }
  chipRow.append(chip('all', 'ทั้งหมด'), chip('customer', 'ลูกค้า'), chip('prospect', 'ผู้มุ่งหวัง'));
  renderRows();

  const renewals = opts.renewals || [];
  const nProspect = clients.filter((c) => c.stage === 'prospect').length;

  return h('div', { class: 'dashboard' },
    h('div', { class: 'dash-topbar' },
      h('div', {},
        h('h1', {}, 'สมุดลูกค้า'),
        h('div', { class: 'muted', style: 'font-size:12.5px;margin-top:3px' },
          `${clients.length - nProspect} ลูกค้า · ${nProspect} ผู้มุ่งหวัง`)),
      h('div', { style: 'flex:1' }),
      sortSel, search,
      h('button', { class: 'btn btn-primary ap-fill', onclick: () => opts.onNew?.() },
        icon(ICONS.plus, { size: 13, width: 1.7 }), 'เพิ่มลูกค้า')),
    chipRow,

    renewals.length
      ? h('div', { class: 'card ap-g elev-sm renew-card' },
          h('div', { class: 'side-kicker' }, `กรมธรรม์ใกล้ครบกำหนดชำระ · 90 วัน (${renewals.length})`),
          h('hr', { class: 'hr', style: 'margin:9px -17px' }),
          ...renewals.slice(0, 12).map((p) => {
            const d = daysUntil(p.renewal_date);
            return h('div', { class: 'renew-line', onclick: () => opts.onOpen?.(p.client_id), style: 'cursor:pointer' },
              h('span', { class: 'rl-name' }, p.client_name),
              h('span', { class: 'muted', style: 'font-size:11.5px' }, `${KIND_LABEL[p.kind] || p.kind}${p.insurer ? ' · ' + p.insurer : ''}`),
              h('span', { class: d < 0 ? 'renew-over' : d <= 30 ? 'renew-soon' : 'muted', style: 'font-size:11.5px;text-align:right' },
                thDate(p.renewal_date) + (d < 0 ? ' · เกินกำหนด' : ` · ${d} วัน`)));
          }))
      : null,

    h('div', { class: 'dash-card' }, listWrap));
}

/* ═══════════════ หน้าลูกค้า 1 คน ═══════════════ */

/**
 * @param {{data:{client,policies,analyses}, unlinked:any[], onBack, onSaveClient, onDeleteClient,
 *   onAddPolicy, onUpdatePolicy, onDeletePolicy, onLinkAnalysis, onOpenAnalysis, onNewAnalysis}} opts
 */
export function renderClientDetail(opts = {}) {
  const { client } = opts.data;
  let policies = [...(opts.data.policies || [])];
  let analyses = [...(opts.data.analyses || [])];
  let interactions = [...(opts.data.interactions || [])];
  let unlinked = [...(opts.unlinked || [])];

  /* ---- โปรไฟล์ลูกค้า ---- */
  const f = {
    full_name: input(client.full_name, { placeholder: 'ชื่อ-นามสกุล' }),
    nickname: input(client.nickname, { placeholder: 'ชื่อเล่น' }),
    birth_date: input(client.birth_date, { type: 'date' }),
    sex: select(client.sex, [['', '—'], ['M', 'ชาย'], ['F', 'หญิง']]),
    phone: input(client.phone, { placeholder: '08x-xxx-xxxx', inputmode: 'tel' }),
    line_id: input(client.line_id, { placeholder: 'LINE ID ลูกค้า' }),
    occupation: input(client.occupation, { placeholder: 'อาชีพ' }),
    marital_status: select(client.marital_status, [['', '—'], ...Object.entries(MARITAL_LABEL)]),
    referred_by: input(client.referred_by, { placeholder: 'ใครแนะนำลูกค้าคนนี้' }),
    note: h('textarea', { class: 'input', rows: '3', placeholder: 'บันทึกเพิ่มเติม — ความต้องการ, จังหวะติดตาม, ประวัติการคุย' }, client.note || ''),
  };
  const orphanEl = h('input', { type: 'checkbox', ...(client.orphan ? { checked: '' } : {}) });
  const pMsg = h('div', { class: 'auth-fine' });
  const saveBtn = h('button', { class: 'btn btn-primary ap-fill', style: 'justify-content:center',
    onclick: async () => {
      saveBtn.disabled = true; pMsg.textContent = '';
      try {
        const vals = Object.fromEntries(Object.entries(f).map(([k, el]) => [k, el.value.trim()]));
        vals.orphan = orphanEl.checked;
        await opts.onSaveClient?.(vals);
        pMsg.style.color = 'var(--ap-ok)'; pMsg.textContent = 'บันทึกแล้ว';
      } catch (e) { pMsg.style.color = 'var(--ap-bad)'; pMsg.textContent = 'บันทึกไม่สำเร็จ: ' + e.message; }
      saveBtn.disabled = false;
    } }, 'บันทึกข้อมูลลูกค้า');

  const profileCard = h('div', { class: 'card ap-g elev-sm' },
    h('div', { class: 'field-grid two' },
      field('ชื่อ-นามสกุล', f.full_name), field('ชื่อเล่น', f.nickname),
      field('วันเกิด', f.birth_date), field('เพศ', f.sex),
      field('เบอร์โทร', f.phone), field('LINE ID', f.line_id),
      field('อาชีพ', f.occupation), field('สถานภาพ', f.marital_status),
      field('ผู้แนะนำ', f.referred_by)),
    h('label', { class: 'pol-check', style: 'margin:2px 0 10px' }, orphanEl, h('span', {}, 'เคสรับดูแลต่อ (orphan — ไม่ใช่ลูกค้าที่เราขายเอง)')),
    field('บันทึก', f.note),
    h('div', { style: 'display:flex;gap:8px;align-items:center' }, saveBtn, pMsg));

  /* ---- กรมธรรม์ที่ถืออยู่ ---- */
  const polWrap = h('div', { class: 'pol-list' });
  const mainPolicies = () => policies.filter((p) => !p.parent_policy_id);
  const ridersOf = (id) => policies.filter((p) => p.parent_policy_id === id);

  function renderPolicies() {
    polWrap.innerHTML = '';
    const mains = mainPolicies();
    if (!mains.length) {
      polWrap.append(h('div', { class: 'dash-empty', style: 'padding:16px' }, 'ยังไม่ได้บันทึกกรมธรรม์ของลูกค้าคนนี้'));
      return;
    }
    mains.forEach((p) => polWrap.append(policyRow(p)));
  }

  function covLine(p) {
    const bits = [];
    if (HEALTH_KINDS.has(p.kind)) {
      if (p.health_room_daily) bits.push(['ค่าห้อง/วัน ', g(p.health_room_daily)]);
      if (p.health_annual) bits.push(['เหมาจ่าย/ปี ', g(p.health_annual)]);
      if (p.has_copay) bits.push(['มี copay']);
    } else if (p.kind === 'ci') {
      if (p.ci_sum || p.sum_assured) bits.push(['ทุน CI ', g(p.ci_sum || p.sum_assured)]);
    } else if (p.sum_assured) {
      bits.push(['ทุน ', g(p.sum_assured)]);
    }
    if (p.ci_sum && p.kind !== 'ci') bits.push(['+ CI ', g(p.ci_sum)]);
    return bits;
  }

  function policyRow(p, isRider = false) {
    const wrap = h('div', { class: isRider ? 'pol-rider' : 'pol-card' });
    const showView = () => {
      wrap.innerHTML = '';
      const prem = g(p.premium);
      wrap.append(
        h('div', { class: 'pol-head' },
          h('span', { class: 'tag p-info' }, KIND_LABEL[p.kind] || p.kind),
          h('span', { class: 'pol-title' }, [p.insurer, p.plan_name].filter(Boolean).join(' — ') || '(ไม่ระบุแบบ)'),
          p.policy_no ? h('span', { class: 'muted', style: 'font-size:11px' }, `#${p.policy_no}`) : null,
          p.status !== 'active' ? h('span', { class: 'tag p-warn' }, STATUS_LABEL[p.status] || p.status) : null,
          h('div', { style: 'flex:1' }),
          h('button', { class: 'icon-btn', title: 'แก้ไข', onclick: showEdit }, icon('M3 11l6-6 2 2-6 6H3z', { size: 13, stroke: 'var(--ap-ink2)' })),
          h('button', { class: 'icon-btn', title: 'ลบ', onclick: async () => {
            if (!confirm(isRider ? 'ลบสัญญาเพิ่มเติมนี้?' : 'ลบกรมธรรม์นี้? (สัญญาเพิ่มเติมจะถูกลบด้วย)')) return;
            try { await opts.onDeletePolicy?.(p.id); policies = policies.filter((x) => x.id !== p.id && x.parent_policy_id !== p.id); renderPolicies(); }
            catch (e) { alert('ลบไม่สำเร็จ: ' + e.message); }
          } }, icon(ICONS.minus, { size: 13, stroke: 'var(--ap-bad)' }))),
        h('div', { class: 'pol-meta' },
          ...covLine(p).map(([a, b]) => h('span', {}, a, b ? h('b', { class: 'n' }, b) : null)),
          prem ? h('span', {}, 'เบี้ย ', h('b', { class: 'n' }, prem), ` / ${FREQ_LABEL[p.premium_freq] || p.premium_freq}`) : null,
          p.payment_method ? h('span', {}, PAY_LABEL[p.payment_method] || p.payment_method) : null,
          p.renewal_date ? h('span', {}, 'ครบกำหนดชำระ ', h('b', {}, thDate(p.renewal_date))) : null,
          p.paid_to_year ? h('span', {}, `ชำระถึงปี ${p.paid_to_year}`) : null),
        p.beneficiary ? h('div', { class: 'pol-note muted' }, 'ผู้รับประโยชน์: ' + p.beneficiary) : null,
        p.exclusions ? h('div', { class: 'pol-excl' }, h('b', {}, 'ข้อยกเว้น/เบี้ยเพิ่ม: '), p.exclusions) : null,
        p.note ? h('div', { class: 'pol-note muted' }, p.note) : null);
      if (!isRider) {
        const riders = ridersOf(p.id);
        riders.forEach((r) => wrap.append(policyRow(r, true)));
        wrap.append(h('button', { class: 'pol-add-rider', onclick: () => openRiderForm(p.id) },
          icon(ICONS.plus, { size: 10, width: 1.7 }), 'สัญญาเพิ่มเติม'));
      }
    };
    const showEdit = () => { wrap.innerHTML = ''; wrap.append(policyForm(p, {
      onDone: (saved) => { Object.assign(p, saved); showView(); },
      onCancel: showView,
    })); };
    showView();
    return wrap;
  }

  function openRiderForm(parentId) {
    if (polWrap.querySelector('.pol-form.new')) return;
    const form = policyForm({ parent_policy_id: parentId, kind: 'ci' }, {
      onDone: (saved) => { if (saved) policies.push(saved); renderPolicies(); },
      onCancel: () => renderPolicies(),
    });
    form.classList.add('new');
    polWrap.append(h('div', { class: 'pol-rider' }, form));
  }

  function policyForm(p, { onDone, onCancel }) {
    const isNew = !p.id;
    const isRider = !!p.parent_policy_id;
    const kindSel = select(p.kind || (isRider ? 'ci' : 'life'), Object.entries(KIND_LABEL));
    const pf = {
      kind: kindSel,
      status: select(p.status || 'active', Object.entries(STATUS_LABEL)),
      insurer: input(p.insurer, { placeholder: 'บริษัทประกัน' }),
      plan_name: input(p.plan_name, { placeholder: isRider ? 'ชื่อสัญญาเพิ่มเติม' : 'ชื่อแบบประกัน' }),
      policy_no: input(p.policy_no, { placeholder: 'เลขที่กรมธรรม์' }),
      sum_assured: input(p.sum_assured, { type: 'number', inputmode: 'numeric', placeholder: 'ทุนประกัน (บาท)' }),
      health_room_daily: input(p.health_room_daily, { type: 'number', inputmode: 'numeric', placeholder: 'ค่าห้อง/วัน (บาท)' }),
      health_annual: input(p.health_annual, { type: 'number', inputmode: 'numeric', placeholder: 'วงเงินเหมาจ่าย/ปี (บาท)' }),
      ci_sum: input(p.ci_sum, { type: 'number', inputmode: 'numeric', placeholder: 'ทุนโรคร้ายแรง (บาท)' }),
      premium: input(p.premium, { type: 'number', inputmode: 'numeric', placeholder: 'เบี้ย (บาท)' }),
      premium_freq: select(p.premium_freq || 'year', Object.entries(FREQ_LABEL)),
      payment_method: select(p.payment_method || '', [['', '—'], ...Object.entries(PAY_LABEL)]),
      renewal_date: input(p.renewal_date, { type: 'date' }),
      start_date: input(p.start_date, { type: 'date' }),
      paid_to_year: input(p.paid_to_year, { type: 'number', inputmode: 'numeric', placeholder: 'พ.ศ.' }),
      beneficiary: input(p.beneficiary, { placeholder: 'ชื่อ + ความสัมพันธ์' }),
      exclusions: h('textarea', { class: 'input', rows: '2', placeholder: 'ข้อยกเว้น / เบี้ยเพิ่ม (loading) / เงื่อนไขจากการพิจารณารับประกัน' }, p.exclusions || ''),
      note: input(p.note, { placeholder: 'หมายเหตุ' }),
    };
    const copayEl = h('input', { type: 'checkbox', ...(p.has_copay ? { checked: '' } : {}) });

    const covFields = h('div', { class: 'field-grid two' });
    function renderCov() {
      covFields.innerHTML = '';
      const k = kindSel.value;
      if (HEALTH_KINDS.has(k)) {
        covFields.append(field('ค่าห้อง/วัน', pf.health_room_daily), field('วงเงินเหมาจ่าย/ปี', pf.health_annual));
        covFields.append(h('label', { class: 'pol-check' }, copayEl, h('span', {}, 'มีความรับผิดส่วนแรก (copay / deductible)')));
      } else if (k === 'ci') {
        covFields.append(field('ทุนโรคร้ายแรง', pf.ci_sum));
      } else {
        covFields.append(field('ทุนประกัน', pf.sum_assured));
        if (!isRider) covFields.append(field('ทุนโรคร้ายแรงแนบท้าย (ถ้ามี)', pf.ci_sum));
      }
    }
    renderCov();
    kindSel.addEventListener('change', renderCov);

    const msg = h('div', { class: 'auth-fine' });
    const save = h('button', { class: 'btn btn-primary ap-fill', style: 'justify-content:center',
      onclick: async () => {
        save.disabled = true; msg.textContent = '';
        const vals = Object.fromEntries(Object.entries(pf).map(([k, el]) => [k, el.value]));
        vals.has_copay = copayEl.checked;
        if (p.parent_policy_id) vals.parent_policy_id = p.parent_policy_id;
        try {
          const saved = isNew ? await opts.onAddPolicy?.(vals) : await opts.onUpdatePolicy?.(p.id, vals);
          onDone?.(saved);
        } catch (e) { msg.style.color = 'var(--ap-bad)'; msg.textContent = 'บันทึกไม่สำเร็จ: ' + e.message; save.disabled = false; }
      } }, isNew ? (isRider ? 'เพิ่มสัญญาเพิ่มเติม' : 'เพิ่มกรมธรรม์') : 'บันทึก');

    return h('div', { class: 'pol-form' },
      isRider ? h('div', { class: 'muted', style: 'font-size:11.5px' }, 'สัญญาเพิ่มเติม (แนบท้ายสัญญาหลัก)') : null,
      h('div', { class: 'field-grid two' },
        field('ประเภท', pf.kind), field('สถานะ', pf.status),
        field('บริษัทประกัน', pf.insurer), field('ชื่อแบบ', pf.plan_name),
        isRider ? null : field('เลขที่กรมธรรม์', pf.policy_no)),
      covFields,
      h('div', { class: 'field-grid two' },
        field('เบี้ย', pf.premium), field('งวดชำระ', pf.premium_freq),
        field('ช่องทางชำระเบี้ย', pf.payment_method), field('วันครบกำหนดชำระถัดไป', pf.renewal_date),
        isRider ? null : field('วันเริ่มสัญญา', pf.start_date),
        isRider ? null : field('ชำระเบี้ยถึงปี (พ.ศ.)', pf.paid_to_year)),
      isRider ? null : field('ผู้รับประโยชน์', pf.beneficiary),
      field('ข้อยกเว้น / เบี้ยเพิ่ม', pf.exclusions),
      field('หมายเหตุ', pf.note),
      h('div', { style: 'display:flex;gap:8px;align-items:center' },
        save,
        h('button', { class: 'btn btn-secondary', onclick: () => onCancel?.() }, 'ยกเลิก'),
        msg));
  }

  const addPolBtn = h('button', { class: 'btn btn-secondary', onclick: () => {
    if (polWrap.querySelector('.pol-form.new')) return;
    const holder = h('div', { class: 'pol-card' });
    const form = policyForm({}, {
      onDone: (saved) => { if (saved) { policies.push(saved); } renderPolicies(); },
      onCancel: () => { holder.remove(); },
    });
    form.classList.add('new');
    holder.append(form);
    polWrap.prepend(holder);
  } }, icon(ICONS.plus, { size: 12, width: 1.7 }), 'เพิ่มกรมธรรม์');
  renderPolicies();

  /* ---- ผลวิเคราะห์ที่ผูกไว้ ---- */
  const anaWrap = h('div', {});
  function renderAnalyses() {
    anaWrap.innerHTML = '';
    analyses.forEach((a) => anaWrap.append(
      h('div', { class: 'link-row' },
        h('span', { class: 'lr-name', onclick: () => opts.onOpenAnalysis?.(a.id), style: 'cursor:pointer' },
          a.summary?.overallLevel ? `${a.summary.overallLevel} · ` : '', thDate(a.created_at) || '—'),
        h('button', { class: 'icon-btn', title: 'ปลดผูก', onclick: async () => {
          try { await opts.onLinkAnalysis?.(a.id, null); const row = analyses.find((x) => x.id === a.id); analyses = analyses.filter((x) => x.id !== a.id); if (row) unlinked.unshift({ id: row.id, client_name: row.client_name, created_at: row.created_at }); renderAnalyses(); refreshPicker(); }
          catch (e) { alert('ปลดผูกไม่สำเร็จ: ' + e.message); }
        } }, icon(ICONS.minus, { size: 13, stroke: 'var(--ap-ink2)' })))));
    if (!analyses.length) anaWrap.append(h('div', { class: 'muted', style: 'font-size:12px;padding:4px 0' }, 'ยังไม่มีผลวิเคราะห์ผูกกับลูกค้าคนนี้'));
  }
  const picker = h('select', { class: 'input', style: 'flex:1' });
  function refreshPicker() {
    picker.innerHTML = '';
    picker.append(h('option', { value: '' }, unlinked.length ? 'เลือกผลวิเคราะห์ที่มีอยู่…' : 'ไม่มีผลวิเคราะห์ที่ยังไม่ได้ผูก'));
    unlinked.forEach((u) => picker.append(h('option', { value: u.id }, `${u.client_name || '(ไม่ระบุชื่อ)'} · ${thDate(u.created_at) || ''}`)));
    picker.disabled = !unlinked.length;
  }
  const linkBtn = h('button', { class: 'btn btn-secondary', onclick: async () => {
    const id = picker.value;
    if (!id) return;
    try {
      await opts.onLinkAnalysis?.(id, client.id);
      const row = unlinked.find((x) => x.id === id);
      unlinked = unlinked.filter((x) => x.id !== id);
      analyses.unshift({ id, client_name: row?.client_name, created_at: row?.created_at, summary: {} });
      renderAnalyses(); refreshPicker();
    } catch (e) { alert('แนบไม่สำเร็จ: ' + e.message); }
  } }, 'แนบ');
  renderAnalyses(); refreshPicker();

  /* ---- ประวัติการติดต่อ ---- */
  const CHAN_LABEL = { call: 'โทร', line: 'LINE', meet: 'เจอตัว', other: 'อื่น ๆ' };
  const logWrap = h('div', {});
  function renderLog() {
    logWrap.innerHTML = '';
    if (!interactions.length) { logWrap.append(h('div', { class: 'muted', style: 'font-size:12px;padding:4px 0' }, 'ยังไม่มีบันทึกการติดต่อ')); return; }
    interactions.slice(0, 12).forEach((it) => logWrap.append(
      h('div', { class: 'log-row' },
        h('div', { class: 'log-meta muted' }, `${thDate(it.occurred_on)} · ${CHAN_LABEL[it.channel] || it.channel}`),
        h('div', { class: 'log-body' }, it.outcome))));
  }
  renderLog();
  const logText = h('input', { class: 'input', placeholder: 'บันทึกผลการติดต่อ' });
  const logChan = select('call', Object.entries(CHAN_LABEL), { style: 'max-width:110px' });
  const logMsg = h('div', { class: 'auth-fine' });
  const logBtn = h('button', { class: 'btn btn-secondary', onclick: async () => {
    if (!logText.value.trim()) return;
    logBtn.disabled = true; logMsg.textContent = '';
    try {
      const saved = await opts.onAddInteraction?.({ channel: logChan.value, outcome: logText.value.trim() });
      if (saved) interactions.unshift(saved);
      logText.value = ''; renderLog();
    } catch (e) { logMsg.style.color = 'var(--ap-bad)'; logMsg.textContent = e.message; }
    logBtn.disabled = false;
  } }, 'บันทึก');

  /* ---- ประกอบหน้า ---- */
  return h('div', { class: 'dashboard client-detail' },
    h('a', { class: 'back-link', href: '?view=clients', onclick: (e) => { e.preventDefault(); opts.onBack?.(); } },
      icon(ICONS.back, { size: 13 }), 'สมุดลูกค้า'),
    h('div', { class: 'dash-topbar' },
      h('div', {}, h('h1', {}, client.full_name,
        client.nickname ? h('span', { class: 'muted', style: 'font-size:16px' }, ` (${client.nickname})`) : null,
        client.stage === 'prospect' ? h('span', { class: 'tag p-info', style: 'margin-left:8px;vertical-align:middle' }, 'ผู้มุ่งหวัง') : null)),
      h('div', { style: 'flex:1' }),
      client.stage === 'prospect'
        ? h('button', { class: 'btn btn-secondary', onclick: async () => {
            try { await opts.onSetStage?.('customer'); client.stage = 'customer'; location.reload(); }
            catch (e) { alert('ไม่สำเร็จ: ' + e.message); }
          } }, 'แปลงเป็นลูกค้า')
        : null,
      h('button', { class: 'btn btn-secondary', onclick: () => opts.onNewAnalysis?.() }, 'วิเคราะห์ Protection Gap'),
      h('button', { class: 'btn btn-secondary', style: 'color:var(--ap-bad)', onclick: async () => {
        if (!confirm(`ลบ "${client.full_name}" ออกจากสมุด?\n\nกรมธรรม์ที่บันทึกไว้จะถูกลบด้วย · ผลวิเคราะห์ที่ผูกไว้จะไม่ถูกลบ แต่จะถูกปลดผูก`)) return;
        try { await opts.onDeleteClient?.(); } catch (e) { alert('ลบไม่สำเร็จ: ' + e.message); }
      } }, 'ลบลูกค้า')),

    h('div', { class: 'client-cols' },
      h('div', {},
        h('h2', { class: 'sec-h' }, 'กรมธรรม์ที่ถืออยู่', addPolBtn),
        polWrap),
      h('div', { class: 'client-side' },
        h('div', { class: 'card ap-g elev-sm' },
          h('div', { class: 'side-kicker' }, 'ผลวิเคราะห์ Protection Gap'),
          h('hr', { class: 'hr', style: 'margin:9px -17px' }),
          anaWrap,
          h('div', { style: 'display:flex;gap:6px;margin-top:10px' }, picker, linkBtn)),
        h('div', { class: 'card ap-g elev-sm' },
          h('div', { class: 'side-kicker' }, 'ประวัติการติดต่อ'),
          h('hr', { class: 'hr', style: 'margin:9px -17px' }),
          logWrap,
          h('div', { style: 'display:flex;gap:6px;margin-top:10px' }, logChan, logText, logBtn),
          logMsg))),

    h('h2', { class: 'sec-h', style: 'margin-top:26px' }, 'ข้อมูลลูกค้า'),
    profileCard);
}
