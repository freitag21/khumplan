import { h, icon, ICONS } from './dom.js';
import { KIND_LABEL } from './clients.js';

const THMONTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const thDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(String(iso).length <= 10 ? iso + 'T00:00:00' : iso);
  return Number.isNaN(d.getTime()) ? '—' : `${d.getDate()} ${THMONTH[d.getMonth()]} ${d.getFullYear() + 543}`;
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const isoPlus = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
const daysUntil = (iso) => Math.round((new Date(iso + 'T00:00:00') - new Date().setHours(0, 0, 0, 0)) / 86400000);

const KIND_TAG = {
  nurture: ['ติดตามผู้มุ่งหวัง', 'p-info'],
  resale: ['โอกาสเสนอเพิ่ม', 'p-warn'],
  renewal: ['ต่ออายุ', 'p-ok'],
  birthday: ['วันเกิด', 'p-info'],
  custom: ['กำหนดเอง', 'p-info'],
};

const trimList = (arr) => arr.slice(0, 2).join(' · ') + (arr.length > 2 ? ` + อีก ${arr.length - 2}` : '');

/** วันเกิดปีนี้ (clamp 29 ก.พ. → 28) จาก birth_date */
function birthdayThisYear(birthDate) {
  const mm = Number(birthDate.slice(5, 7));
  let dd = Number(birthDate.slice(8, 10));
  const yr = new Date().getFullYear();
  if (mm === 2 && dd === 29) dd = 28;
  return `${yr}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/**
 * @param {{
 *   reminders:any[], renewals:any[], birthdays:any[], resale:any[],
 *   onOpenClient, onAddReminder, onToggleDone, onSnooze, onDeleteReminder,
 *   onLogOutcome, onMarkPaid, onBack
 * }} opts
 */
export function renderFollowups(opts = {}) {
  let reminders = [...(opts.reminders || [])];
  // ชุดคีย์ของรายการติดตามที่มีอยู่แล้ว → กันสร้างซ้ำจากแหล่งอัตโนมัติ
  const remKey = (kind, clientId) => `${kind}::${clientId || ''}`;
  const existingKeys = new Set(reminders.map((r) => remKey(r.kind, r.client_id)));

  const listWrap = h('div', {});

  function quickLinks(phone, line) {
    return [
      phone ? h('a', { class: 'fu-ql', href: `tel:${phone}`, title: 'โทร' }, icon('M4 3l2 3-1.5 1.5a8 8 0 004 4L11 13l3 2v0a2 2 0 01-2 2A12 12 0 013 5a2 2 0 011-2z', { size: 13, stroke: 'var(--ap-pri-ink)' })) : null,
      line ? h('a', { class: 'fu-ql', href: `https://line.me/R/ti/p/${encodeURIComponent(line)}`, target: '_blank', rel: 'noopener', title: 'LINE' }, icon('M8 2c3.3 0 6 2.2 6 4.9 0 2.7-2.7 4.9-6 4.9-.5 0-1 0-1.5-.1L4 13v-2.2C2.8 9.9 2 8.5 2 6.9 2 4.2 4.7 2 8 2z', { size: 13, stroke: 'var(--ap-ok)' })) : null,
    ].filter(Boolean);
  }

  function reminderRow(r) {
    const box = h('div', { class: 'fu-row' + (r.done ? ' done' : '') });
    const panel = h('div', {});

    const render = () => {
      box.innerHTML = '';
      const [tagLabel, tagCls] = KIND_TAG[r.kind] || KIND_TAG.custom;
      box.append(
        h('button', { class: 'fu-check', title: r.done ? 'เปิดงานอีกครั้ง' : 'ปิดงาน', onclick: () => {
          if (r.done) { opts.onToggleDone?.(r.id, false).then(() => { r.done = false; render(); }); return; }
          if (r.client_id) { panel.innerHTML = ''; panel.append(doneForm(r, () => { r.done = true; render(); })); }
          else opts.onToggleDone?.(r.id, true).then(() => { r.done = true; render(); });
        } }, r.done ? icon('M3 8l3.5 3.5L13 4', { size: 13, stroke: 'var(--ap-ok)' }) : ''),
        h('div', { class: 'fu-main' },
          h('div', { class: 'fu-top' },
            h('span', { class: `tag ${tagCls}` }, tagLabel),
            h('span', { class: 'fu-title' }, r.title),
            r.client_name ? h('a', { class: 'fu-client', href: '#', onclick: (e) => { e.preventDefault(); opts.onOpenClient?.(r.client_id); } }, r.client_name) : null,
            ...quickLinks(r.client_phone, r.client_line)),
          r.detail ? h('div', { class: 'fu-detail muted' }, r.detail) : null,
          panel),
        h('div', { class: 'fu-side' },
          h('span', { class: 'fu-due muted' }, thDate(r.due_date)),
          r.done ? null : h('button', { class: 'icon-btn', title: 'เลื่อน 7 วัน', onclick: async () => {
            try { r.due_date = await opts.onSnooze?.(r.id, 7) || isoPlus(7); render(); bucketize(); } catch (e) { alert(e.message); }
          } }, icon('M8 4v4l2.5 2.5M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13z', { size: 12, stroke: 'var(--ap-ink2)' })),
          h('button', { class: 'icon-btn', title: 'ลบ', onclick: async () => {
            if (!confirm('ลบรายการติดตามนี้?')) return;
            try { await opts.onDeleteReminder?.(r.id); reminders = reminders.filter((x) => x.id !== r.id); bucketize(); }
            catch (e) { alert('ลบไม่สำเร็จ: ' + e.message); }
          } }, icon(ICONS.minus, { size: 13, stroke: 'var(--ap-ink2)' }))));
    };
    render();
    return box;
  }

  function doneForm(r, onClosed) {
    const outcome = h('textarea', { class: 'input', rows: '2', placeholder: 'โทรแล้วเป็นยังไง / คุยเรื่องอะไร' });
    const chan = h('select', { class: 'input', style: 'max-width:120px' },
      h('option', { value: 'call' }, 'โทร'), h('option', { value: 'line' }, 'LINE'),
      h('option', { value: 'meet' }, 'เจอตัว'), h('option', { value: 'other' }, 'อื่น ๆ'));
    const next = h('input', { class: 'input', type: 'date', style: 'max-width:150px' });
    const msg = h('div', { class: 'auth-fine' });
    const finish = async (withLog) => {
      try {
        if (withLog) {
          await opts.onLogOutcome?.({ client_id: r.client_id, channel: chan.value, outcome: outcome.value, occurred_on: todayISO() });
          if (next.value) {
            const rem = await opts.onAddReminder?.({ kind: 'custom', client_id: r.client_id, title: `ติดตามต่อ: ${r.client_name || ''}`.trim(), due_date: next.value });
            if (rem) reminders.push(rem);
          }
        }
        await opts.onToggleDone?.(r.id, true);
        onClosed?.();
        bucketize();
      } catch (e) { msg.style.color = 'var(--ap-bad)'; msg.textContent = e.message; }
    };
    return h('div', { class: 'fu-doneform' },
      h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start' }, outcome, chan),
      h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px' },
        h('span', { class: 'muted', style: 'font-size:11.5px' }, 'ตามอีกที'), next,
        h('button', { class: 'btn btn-primary ap-fill', style: 'padding:5px 12px;font-size:12px', onclick: () => finish(true) }, 'บันทึกผล & ปิดงาน'),
        h('button', { class: 'btn btn-secondary', style: 'padding:5px 12px;font-size:12px', onclick: () => finish(false) }, 'แค่ปิดงาน'),
        msg));
  }

  /* ---- buckets ---- */
  function bucketize() {
    listWrap.innerHTML = '';
    const open = reminders.filter((r) => !r.done).sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
    const done = reminders.filter((r) => r.done);
    const over = open.filter((r) => daysUntil(r.due_date) < 0);
    const soon = open.filter((r) => { const d = daysUntil(r.due_date); return d >= 0 && d <= 7; });
    const later = open.filter((r) => daysUntil(r.due_date) > 7);

    if (!open.length && !done.length) {
      listWrap.append(h('div', { class: 'muted', style: 'font-size:12.5px;padding:10px 0' }, 'ยังไม่มีรายการติดตาม'));
      return;
    }
    if (over.length) { listWrap.append(subHead('เลยกำหนด', over.length, 'renew-over')); over.forEach((r) => listWrap.append(reminderRow(r))); }
    if (soon.length) { listWrap.append(subHead('วันนี้ – 7 วัน', soon.length, 'renew-soon')); soon.forEach((r) => listWrap.append(reminderRow(r))); }
    if (later.length) {
      const det = h('details', { class: 'fu-later' }, h('summary', {}, `ต่อไป (${later.length})`));
      later.forEach((r) => det.append(reminderRow(r)));
      listWrap.append(det);
    }
    if (done.length) {
      const det = h('details', { class: 'fu-later' }, h('summary', {}, `ปิดงานแล้ว (${done.length})`));
      done.forEach((r) => det.append(reminderRow(r)));
      listWrap.append(det);
    }
  }
  function subHead(label, n, cls) {
    return h('div', { class: 'fu-subhead' }, h('span', { class: cls }, label), h('span', { class: 'muted' }, n));
  }
  bucketize();

  /* ---- เพิ่มรายการเอง ---- */
  const nTitle = h('input', { class: 'input', placeholder: 'เช่น โทรติดตามเรื่องแบบบำนาญ' });
  const nDate = h('input', { class: 'input', type: 'date', value: todayISO() });
  const nMsg = h('div', { class: 'auth-fine' });
  const addBtn = h('button', { class: 'btn btn-primary ap-fill', style: 'justify-content:center',
    onclick: async () => {
      addBtn.disabled = true; nMsg.textContent = '';
      try {
        const rem = await opts.onAddReminder?.({ kind: 'custom', title: nTitle.value.trim(), due_date: nDate.value });
        if (rem) { reminders.push(rem); bucketize(); }
        nTitle.value = '';
      } catch (e) { nMsg.style.color = 'var(--ap-bad)'; nMsg.textContent = e.message; }
      addBtn.disabled = false;
    } }, 'เพิ่ม');

  /* ---- แหล่งอัตโนมัติ ---- */
  function autoRow(label, sub, opts2) {
    const { kind, title, due_date, detail, client_id, extraBtn } = opts2;
    const already = existingKeys.has(remKey(kind, client_id));
    let sideEl;
    if (already) {
      sideEl = h('span', { class: 'muted', style: 'font-size:11.5px' }, 'ตั้งเตือนแล้ว ✓');
    } else {
      const btn = h('button', { class: 'btn btn-secondary', style: 'padding:5px 10px;font-size:12px;white-space:nowrap',
        onclick: async () => {
          btn.disabled = true;
          try {
            const rem = await opts.onAddReminder?.({ kind, title, due_date, detail: detail || '', client_id: client_id || '' });
            if (rem) { reminders.push(rem); existingKeys.add(remKey(kind, client_id)); bucketize(); }
            btn.replaceWith(h('span', { class: 'muted', style: 'font-size:11.5px' }, 'ตั้งเตือนแล้ว ✓'));
          } catch (e) { btn.disabled = false; alert('ตั้งเตือนไม่สำเร็จ: ' + e.message); }
        } }, '＋ ตั้งเตือน');
      sideEl = btn;
    }
    return h('div', { class: 'fu-auto' },
      h('div', { class: 'fu-main' },
        h('div', { class: 'fu-top' },
          h('span', { class: 'fu-title' }, label),
          client_id ? h('a', { class: 'fu-client', href: '#', onclick: (e) => { e.preventDefault(); opts.onOpenClient?.(client_id); } }, 'เปิด') : null),
        sub ? h('div', { class: 'fu-detail muted' }, sub) : null),
      h('div', { class: 'fu-side' }, extraBtn || null, sideEl));
  }

  const renewals = opts.renewals || [];
  const birthdays = opts.birthdays || [];
  const resale = opts.resale || [];

  function block(title, count, ...body) {
    return h('div', { class: 'fu-block' },
      h('h2', { class: 'sec-h' }, title, count != null ? h('span', { class: 'muted', style: 'font-size:12.5px;font-weight:400' }, `${count}`) : null),
      ...body);
  }

  return h('div', { class: 'dashboard followups' },
    h('a', { class: 'back-link', href: '?view=dashboard', onclick: (e) => { e.preventDefault(); opts.onBack?.(); } },
      icon(ICONS.back, { size: 13 }), 'แดชบอร์ด'),
    h('h1', { style: 'font-size:22px;margin-bottom:4px' }, 'งานติดตาม'),
    h('div', { class: 'muted', style: 'font-size:12.5px;margin-bottom:20px' }, 'ต่ออายุ · วันเกิด · โอกาสเสนอเพิ่ม · ผู้มุ่งหวังที่รอตามต่อ — รวมไว้ที่เดียว'),

    block('รายการติดตาม', reminders.filter((r) => !r.done).length,
      listWrap,
      h('div', { class: 'fu-add' },
        h('div', { class: 'fu-add-grid' },
          h('div', { class: 'field ap-f' }, h('label', {}, 'หัวข้อ'), nTitle),
          h('div', { class: 'field ap-f' }, h('label', {}, 'ครบกำหนด'), nDate)),
        h('div', { style: 'display:flex;gap:8px;align-items:center;margin-top:8px' }, addBtn, nMsg))),

    renewals.length
      ? block('ครบกำหนดชำระเบี้ย · 90 วัน', renewals.length,
          ...renewals.map((p) => {
            const paid = h('button', { class: 'btn btn-secondary', style: 'padding:5px 10px;font-size:12px;white-space:nowrap',
              onclick: async () => {
                if (!confirm(`ยืนยันว่าลูกค้าชำระเบี้ยงวดนี้แล้ว?\nระบบจะเลื่อนวันครบกำหนดของกรมธรรม์นี้ไปงวดถัดไป`)) return;
                paid.disabled = true;
                try { await opts.onMarkPaid?.(p.id); paid.replaceWith(h('span', { class: 'muted', style: 'font-size:11.5px' }, 'บันทึกแล้ว ✓')); }
                catch (e) { paid.disabled = false; alert('ไม่สำเร็จ: ' + e.message); }
              } }, 'ชำระแล้ว');
            return autoRow(
              `${p.client_name} — ${KIND_LABEL[p.kind] || p.kind}${p.insurer ? ' · ' + p.insurer : ''}`,
              `ครบกำหนด ${thDate(p.renewal_date)}${daysUntil(p.renewal_date) < 0 ? ' · เกินกำหนด' : ''}`,
              { kind: 'renewal', title: `ต่ออายุ: ${p.client_name} (${KIND_LABEL[p.kind] || p.kind})`, due_date: p.renewal_date,
                detail: [p.insurer, p.plan_name].filter(Boolean).join(' '), client_id: p.client_id, extraBtn: paid });
          }))
      : null,

    birthdays.length
      ? block('วันเกิดเดือนนี้', birthdays.length,
          ...birthdays.map((c) => autoRow(
            `${c.full_name}${c.nickname ? ` (${c.nickname})` : ''}`,
            `วันเกิด ${c.day} ${THMONTH[new Date().getMonth()]}`,
            { kind: 'birthday', title: `อวยพรวันเกิด: ${c.full_name}`, due_date: birthdayThisYear(c.birth_date), client_id: c.id }))
      )
      : null,

    resale.length
      ? block('โอกาสเสนอเพิ่ม · จาก Protection Gap', resale.length,
          ...resale.map((r) => {
            const parts = [];
            if (r.gaps?.length) parts.push(`ยังไม่มี: ${trimList(r.gaps)}`);
            if (r.groupOnly?.length) parts.push(`มีแต่ประกันกลุ่ม (หายเมื่อออกจากงาน): ${trimList(r.groupOnly)}`);
            if (r.underinsured?.length) parts.push(`ทุนยังน้อยกว่าที่ควรมี: ${trimList(r.underinsured)}`);
            if (r.stale) parts.push('ผลวิเคราะห์เก่ากว่า 1 ปี — ควรทบทวนแผนประจำปี');
            const primary = r.gaps?.[0] || r.groupOnly?.[0] || r.underinsured?.[0] || 'ทบทวนแผน';
            const ignore = h('button', { class: 'btn btn-secondary', style: 'padding:5px 10px;font-size:12px',
              onclick: async () => {
                ignore.disabled = true;
                try { await opts.onDismissResale?.(r.client_id); ignore.closest('.fu-auto').remove(); }
                catch (e) { ignore.disabled = false; alert('ไม่สำเร็จ: ' + e.message); }
              } }, 'ไม่สนใจ');
            return autoRow(
              r.client_name,
              `${parts.join(' · ')} · จากผลวิเคราะห์ ${thDate(r.analysisDate)}`,
              { kind: 'resale', title: `เสนอเพิ่ม: ${r.client_name} (${primary})`, due_date: isoPlus(14),
                detail: parts.join(' · '), client_id: r.client_id, extraBtn: ignore });
          }))
      : null,

    (opts.stale || []).length
      ? block('ผู้มุ่งหวังที่เงียบเกิน 2 ปี', opts.stale.length,
          h('div', { class: 'muted', style: 'font-size:11.5px;margin-bottom:8px' }, 'PDPA: ไม่ควรเก็บข้อมูลเกินความจำเป็น — ควรติดต่อเพื่อขอความยินยอมใหม่ หรือลบออกจากสมุด'),
          ...opts.stale.map((c) => h('div', { class: 'fu-auto' },
            h('div', { class: 'fu-main' },
              h('div', { class: 'fu-top' },
                h('span', { class: 'fu-title' }, `${c.full_name}${c.nickname ? ` (${c.nickname})` : ''}`),
                h('a', { class: 'fu-client', href: '#', onclick: (e) => { e.preventDefault(); opts.onOpenClient?.(c.id); } }, 'เปิด')),
              h('div', { class: 'fu-detail muted' }, `เพิ่มเข้าสมุดเมื่อ ${thDate(c.created_at)} · ไม่มีการติดต่อ`))))
      )
      : null);
}
