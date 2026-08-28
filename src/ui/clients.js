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
  const listWrap = h('div', { class: 'dash-list' });
  const search = h('input', { class: 'input', placeholder: 'ค้นหาชื่อ / ชื่อเล่น', style: 'width:220px', oninput: renderRows });

  function renderRows() {
    const q = search.value.trim().toLowerCase();
    const rows = clients.filter((c) => !q
      || (c.full_name || '').toLowerCase().includes(q)
      || (c.nickname || '').toLowerCase().includes(q));
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
  renderRows();

  const renewals = opts.renewals || [];

  return h('div', { class: 'dashboard' },
    h('div', { class: 'dash-topbar' },
      h('div', {},
        h('h1', {}, 'สมุดลูกค้า'),
        h('div', { class: 'muted', style: 'font-size:12.5px;margin-top:3px' }, `ทั้งหมด ${clients.length} คน`)),
      h('div', { style: 'flex:1' }),
      search,
      h('button', { class: 'btn btn-primary ap-fill', onclick: () => opts.onNew?.() },
        icon(ICONS.plus, { size: 13, width: 1.7 }), 'เพิ่มลูกค้า')),

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
    note: h('textarea', { class: 'input', rows: '3', placeholder: 'บันทึกเพิ่มเติม — ความต้องการ, จังหวะติดตาม, ประวัติการคุย' }, client.note || ''),
  };
  const pMsg = h('div', { class: 'auth-fine' });
  const saveBtn = h('button', { class: 'btn btn-primary ap-fill', style: 'justify-content:center',
    onclick: async () => {
      saveBtn.disabled = true; pMsg.textContent = '';
      try {
        await opts.onSaveClient?.(Object.fromEntries(Object.entries(f).map(([k, el]) => [k, el.value.trim()])));
        pMsg.style.color = 'var(--ap-ok)'; pMsg.textContent = 'บันทึกแล้ว';
      } catch (e) { pMsg.style.color = 'var(--ap-bad)'; pMsg.textContent = 'บันทึกไม่สำเร็จ: ' + e.message; }
      saveBtn.disabled = false;
    } }, 'บันทึกข้อมูลลูกค้า');

  const profileCard = h('div', { class: 'card ap-g elev-sm' },
    h('div', { class: 'field-grid two' },
      field('ชื่อ-นามสกุล', f.full_name), field('ชื่อเล่น', f.nickname),
      field('วันเกิด', f.birth_date), field('เพศ', f.sex),
      field('เบอร์โทร', f.phone), field('LINE ID', f.line_id),
      field('อาชีพ', f.occupation), field('สถานภาพ', f.marital_status)),
    field('บันทึก', f.note),
    h('div', { style: 'display:flex;gap:8px;align-items:center' }, saveBtn, pMsg));

  /* ---- กรมธรรม์ที่ถืออยู่ ---- */
  const polWrap = h('div', { class: 'pol-list' });
  function renderPolicies() {
    polWrap.innerHTML = '';
    if (!policies.length) {
      polWrap.append(h('div', { class: 'dash-empty', style: 'padding:16px' }, 'ยังไม่ได้บันทึกกรมธรรม์ของลูกค้าคนนี้'));
      return;
    }
    policies.forEach((p) => polWrap.append(policyRow(p)));
  }
  function policyRow(p) {
    const wrap = h('div', { class: 'pol-card' });
    const showView = () => {
      wrap.innerHTML = '';
      const prem = g(p.premium);
      wrap.append(
        h('div', { class: 'pol-head' },
          h('span', { class: 'tag p-info' }, KIND_LABEL[p.kind] || p.kind),
          h('span', { class: 'pol-title' }, [p.insurer, p.plan_name].filter(Boolean).join(' — ') || '(ไม่ระบุแบบ)'),
          p.status !== 'active' ? h('span', { class: 'tag p-warn' }, STATUS_LABEL[p.status] || p.status) : null,
          h('div', { style: 'flex:1' }),
          h('button', { class: 'icon-btn', title: 'แก้ไข', onclick: showEdit }, icon('M3 11l6-6 2 2-6 6H3z', { size: 13, stroke: 'var(--ap-ink2)' })),
          h('button', { class: 'icon-btn', title: 'ลบ', onclick: async () => {
            if (!confirm('ลบกรมธรรม์นี้?')) return;
            try { await opts.onDeletePolicy?.(p.id); policies = policies.filter((x) => x.id !== p.id); renderPolicies(); }
            catch (e) { alert('ลบไม่สำเร็จ: ' + e.message); }
          } }, icon(ICONS.minus, { size: 13, stroke: 'var(--ap-bad)' }))),
        h('div', { class: 'pol-meta' },
          p.sum_assured ? h('span', {}, 'ทุน ', h('b', { class: 'n' }, g(p.sum_assured))) : null,
          prem ? h('span', {}, 'เบี้ย ', h('b', { class: 'n' }, prem), ` / ${FREQ_LABEL[p.premium_freq] || p.premium_freq}`) : null,
          p.renewal_date ? h('span', {}, 'ครบกำหนดชำระ ', h('b', {}, thDate(p.renewal_date))) : null),
        p.exclusions ? h('div', { class: 'pol-excl' }, h('b', {}, 'ข้อยกเว้น/เบี้ยเพิ่ม: '), p.exclusions) : null,
        p.note ? h('div', { class: 'pol-note muted' }, p.note) : null);
    };
    const showEdit = () => { wrap.innerHTML = ''; wrap.append(policyForm(p, {
      onDone: (saved) => { Object.assign(p, saved); showView(); },
      onCancel: showView,
    })); };
    showView();
    return wrap;
  }

  function policyForm(p, { onDone, onCancel }) {
    const isNew = !p.id;
    const pf = {
      kind: select(p.kind || 'life', Object.entries(KIND_LABEL)),
      status: select(p.status || 'active', Object.entries(STATUS_LABEL)),
      insurer: input(p.insurer, { placeholder: 'บริษัทประกัน' }),
      plan_name: input(p.plan_name, { placeholder: 'ชื่อแบบประกัน' }),
      sum_assured: input(p.sum_assured, { type: 'number', inputmode: 'numeric', placeholder: 'ทุนประกัน (บาท)' }),
      premium: input(p.premium, { type: 'number', inputmode: 'numeric', placeholder: 'เบี้ย (บาท)' }),
      premium_freq: select(p.premium_freq || 'year', Object.entries(FREQ_LABEL)),
      renewal_date: input(p.renewal_date, { type: 'date' }),
      exclusions: h('textarea', { class: 'input', rows: '2', placeholder: 'ข้อยกเว้น / เบี้ยเพิ่ม (loading) / เงื่อนไขจากการพิจารณารับประกัน' }, p.exclusions || ''),
      note: input(p.note, { placeholder: 'หมายเหตุ' }),
    };
    const msg = h('div', { class: 'auth-fine' });
    const save = h('button', { class: 'btn btn-primary ap-fill', style: 'justify-content:center',
      onclick: async () => {
        save.disabled = true; msg.textContent = '';
        const vals = Object.fromEntries(Object.entries(pf).map(([k, el]) => [k, el.value]));
        try {
          const saved = isNew ? await opts.onAddPolicy?.(vals) : await opts.onUpdatePolicy?.(p.id, vals);
          onDone?.(saved);
        } catch (e) { msg.style.color = 'var(--ap-bad)'; msg.textContent = 'บันทึกไม่สำเร็จ: ' + e.message; save.disabled = false; }
      } }, isNew ? 'เพิ่มกรมธรรม์' : 'บันทึก');
    return h('div', { class: 'pol-form' },
      h('div', { class: 'field-grid two' },
        field('ประเภท', pf.kind), field('สถานะ', pf.status),
        field('บริษัทประกัน', pf.insurer), field('ชื่อแบบประกัน', pf.plan_name),
        field('ทุนประกัน', pf.sum_assured), field('เบี้ย', pf.premium),
        field('งวดชำระ', pf.premium_freq), field('วันครบกำหนดชำระถัดไป', pf.renewal_date)),
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
          h('div', { style: 'display:flex;gap:6px;margin-top:10px' }, picker, linkBtn)))),

    h('h2', { class: 'sec-h', style: 'margin-top:26px' }, 'ข้อมูลลูกค้า'),
    profileCard);
}
