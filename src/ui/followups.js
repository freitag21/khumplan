import { h, icon, ICONS } from './dom.js';
import { KIND_LABEL } from './clients.js';

const THMONTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const thDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(String(iso).length <= 10 ? iso + 'T00:00:00' : iso);
  return Number.isNaN(d.getTime()) ? '—' : `${d.getDate()} ${THMONTH[d.getMonth()]} ${d.getFullYear() + 543}`;
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const daysUntil = (iso) => Math.round((new Date(iso + 'T00:00:00') - new Date().setHours(0, 0, 0, 0)) / 86400000);
const dueTag = (iso) => {
  const dd = daysUntil(iso);
  if (dd < 0) return h('span', { class: 'renew-over', style: 'font-size:11.5px' }, `เกิน ${-dd} วัน`);
  if (dd === 0) return h('span', { class: 'renew-soon', style: 'font-size:11.5px' }, 'วันนี้');
  if (dd <= 30) return h('span', { class: 'renew-soon', style: 'font-size:11.5px' }, `อีก ${dd} วัน`);
  return h('span', { class: 'muted', style: 'font-size:11.5px' }, thDate(iso));
};

const KIND_TAG = {
  nurture: ['ติดตามผู้มุ่งหวัง', 'p-info'],
  resale: ['โอกาสเสนอเพิ่ม', 'p-warn'],
  renewal: ['ต่ออายุ', 'p-ok'],
  birthday: ['วันเกิด', 'p-info'],
  custom: ['กำหนดเอง', 'p-info'],
};

/**
 * @param {{
 *   reminders:any[], renewals:any[], birthdays:any[], resale:any[],
 *   onOpenClient:(id)=>void, onAddReminder:(f)=>Promise<any>,
 *   onToggleDone:(id,done)=>Promise, onDeleteReminder:(id)=>Promise, onBack:()=>void
 * }} opts
 */
export function renderFollowups(opts = {}) {
  let reminders = [...(opts.reminders || [])];
  const listWrap = h('div', { class: 'fu-list' });

  function renderReminders() {
    listWrap.innerHTML = '';
    if (!reminders.length) {
      listWrap.append(h('div', { class: 'muted', style: 'font-size:12.5px;padding:10px 0' }, 'ยังไม่มีรายการติดตาม'));
      return;
    }
    reminders
      .slice()
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
      .forEach((r) => {
        const [tagLabel, tagCls] = KIND_TAG[r.kind] || KIND_TAG.custom;
        const box = h('div', { class: 'fu-row' + (r.done ? ' done' : '') },
          h('button', { class: 'fu-check', title: r.done ? 'ยังไม่เสร็จ' : 'ทำเสร็จแล้ว', onclick: async () => {
            try { await opts.onToggleDone?.(r.id, !r.done); r.done = !r.done; renderReminders(); }
            catch (e) { alert('อัปเดตไม่สำเร็จ: ' + e.message); }
          } }, r.done ? icon('M3 8l3.5 3.5L13 4', { size: 13, stroke: 'var(--ap-ok)' }) : ''),
          h('div', { class: 'fu-main' },
            h('div', { class: 'fu-top' },
              h('span', { class: `tag ${tagCls}` }, tagLabel),
              h('span', { class: 'fu-title' }, r.title),
              r.client_name ? h('a', { class: 'fu-client', href: '#', onclick: (e) => { e.preventDefault(); opts.onOpenClient?.(r.client_id); } }, r.client_name) : null),
            r.detail ? h('div', { class: 'fu-detail muted' }, r.detail) : null),
          h('div', { class: 'fu-side' }, dueTag(r.due_date),
            h('button', { class: 'icon-btn', title: 'ลบ', onclick: async () => {
              if (!confirm('ลบรายการติดตามนี้?')) return;
              try { await opts.onDeleteReminder?.(r.id); reminders = reminders.filter((x) => x.id !== r.id); renderReminders(); }
              catch (e) { alert('ลบไม่สำเร็จ: ' + e.message); }
            } }, icon(ICONS.minus, { size: 13, stroke: 'var(--ap-ink2)' }))));
        listWrap.append(box);
      });
  }
  renderReminders();

  /* ---- เพิ่มรายการเอง ---- */
  const nTitle = h('input', { class: 'input', placeholder: 'เช่น โทรติดตามเรื่องแบบบำนาญ' });
  const nDate = h('input', { class: 'input', type: 'date', value: todayISO() });
  const nDetail = h('input', { class: 'input', placeholder: 'รายละเอียด (ไม่บังคับ)' });
  const nMsg = h('div', { class: 'auth-fine' });
  const addBtn = h('button', { class: 'btn btn-primary ap-fill', style: 'justify-content:center',
    onclick: async () => {
      addBtn.disabled = true; nMsg.textContent = '';
      try {
        const rem = await opts.onAddReminder?.({ kind: 'custom', title: nTitle.value.trim(), due_date: nDate.value, detail: nDetail.value.trim() });
        if (rem) { reminders.push(rem); renderReminders(); }
        nTitle.value = ''; nDetail.value = '';
      } catch (e) { nMsg.style.color = 'var(--ap-bad)'; nMsg.textContent = e.message; }
      addBtn.disabled = false;
    } }, 'เพิ่ม');

  /* ---- แหล่งอัตโนมัติ: ปุ่ม "ตั้งเตือน" ---- */
  function autoRow(label, sub, kind, title, due_date, detail, client_id) {
    const btn = h('button', { class: 'btn btn-secondary', style: 'padding:5px 10px;font-size:12px;white-space:nowrap',
      onclick: async () => {
        btn.disabled = true;
        try {
          const rem = await opts.onAddReminder?.({ kind, title, due_date, detail: detail || '', client_id: client_id || '' });
          if (rem) { reminders.push(rem); renderReminders(); }
          btn.replaceWith(h('span', { class: 'muted', style: 'font-size:11.5px' }, 'ตั้งเตือนแล้ว ✓'));
        } catch (e) { btn.disabled = false; alert('ตั้งเตือนไม่สำเร็จ: ' + e.message); }
      } }, '＋ ตั้งเตือน');
    return h('div', { class: 'fu-auto' },
      h('div', { class: 'fu-main' },
        h('div', { class: 'fu-top' },
          h('span', { class: 'fu-title' }, label),
          client_id ? h('a', { class: 'fu-client', href: '#', onclick: (e) => { e.preventDefault(); opts.onOpenClient?.(client_id); } }, 'เปิด') : null),
        sub ? h('div', { class: 'fu-detail muted' }, sub) : null),
      h('div', { class: 'fu-side' }, btn));
  }

  const renewals = opts.renewals || [];
  const birthdays = opts.birthdays || [];
  const resale = opts.resale || [];
  const yr = new Date().getFullYear();

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
        h('div', { class: 'field ap-f', style: 'margin-top:8px' }, h('label', {}, 'รายละเอียด'), nDetail),
        h('div', { style: 'display:flex;gap:8px;align-items:center;margin-top:8px' }, addBtn, nMsg))),

    renewals.length
      ? block('ครบกำหนดชำระเบี้ย · 90 วัน', renewals.length,
          ...renewals.map((p) => autoRow(
            `${p.client_name} — ${KIND_LABEL[p.kind] || p.kind}${p.insurer ? ' · ' + p.insurer : ''}`,
            `ครบกำหนด ${thDate(p.renewal_date)}`,
            'renewal', `ต่ออายุ: ${p.client_name} (${KIND_LABEL[p.kind] || p.kind})`, p.renewal_date,
            [p.insurer, p.plan_name].filter(Boolean).join(' '), p.client_id)))
      : null,

    birthdays.length
      ? block('วันเกิดเดือนนี้', birthdays.length,
          ...birthdays.map((c) => autoRow(
            `${c.full_name}${c.nickname ? ` (${c.nickname})` : ''}`,
            `วันเกิด ${c.day} ${THMONTH[new Date().getMonth()]}`,
            'birthday', `อวยพรวันเกิด: ${c.full_name}`,
            `${yr}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(c.day).padStart(2, '0')}`,
            '', c.id)))
      : null,

    resale.length
      ? block('โอกาสเสนอเพิ่ม · จาก Protection Gap', resale.length,
          ...resale.map((r) => autoRow(
            r.client_name,
            `ยังไม่มีความคุ้มครอง: ${r.gaps.join(' · ')}`,
            'resale', `เสนอเพิ่ม: ${r.client_name} (${r.gaps.join(', ')})`, todayISO(),
            `จากผลวิเคราะห์ ${thDate(r.analysisDate)}`, r.client_id)))
      : null);
}
