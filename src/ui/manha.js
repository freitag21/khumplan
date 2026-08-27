import { h, icon, ICONS, brand } from './dom.js';
import { MANHA_FIELDS, LEAD_FIELDS, screenManha } from '../lib/manha.js';

const STATUS_META = {
  ok: { label: 'พร้อม', tag: 'p-ok', dot: 'var(--ap-ok)' },
  watch: { label: 'ต้องระวัง', tag: 'p-warn', dot: 'var(--ap-warn)' },
  stop: { label: 'ต้องจัดการก่อน', tag: 'p-bad', dot: 'var(--ap-bad)' },
  unknown: { label: 'ยังไม่ระบุ', tag: 'p-info', dot: 'var(--ap-ink2)' },
};
const TONE = { go: 'var(--ap-ok)', watch: 'var(--ap-warn)', stop: 'var(--ap-bad)', neutral: 'var(--ap-ink2)' };

/** @param {{onContinue:(prefill:object)=>void, onSkip:()=>void, onRestart:()=>void}} opts */
export function renderManha(opts = {}) {
  const values = {};
  const resultSlot = h('div', {});
  const evalBtn = h('button', { class: 'btn btn-primary ap-fill', disabled: true,
    onclick: () => {
      resultSlot.replaceChildren(readout(screenManha(values), opts, values));
      resultSlot.scrollIntoView({ behavior: 'smooth' });
    } }, 'ประเมิน MANHA');

  const nameInput = h('input', { class: 'input', placeholder: 'ชื่อย่อ / ชื่อเล่น (ไม่บังคับ)',
    oninput: (e) => { values.prospectName = e.target.value; } });

  function checkComplete() {
    const ready = ['money', 'authority', 'need', 'health'].every((k) => values[k]) && Number(values.age) > 0;
    evalBtn.disabled = !ready;
  }

  const manhaControls = MANHA_FIELDS.map((f) => control(f, checkComplete, values));
  const leadControls = LEAD_FIELDS.map((f) => control(f, () => {}, values));

  return h('div', { class: 'form-card' },
    h('div', { class: 'form-card-head' }, brand(21),
      h('span', { class: 'draft' }, 'คัดกรองเร็ว'),
      h('button', { class: 'btn btn-secondary', style: 'padding:6px 11px;font-size:12.5px', onclick: () => opts.onSkip?.() }, 'ข้ามไปกรอกเต็ม')),
    h('div', { class: 'form-body' },
      h('h1', {}, 'คัดกรองผู้มุ่งหวัง — MANHA'),
      h('div', { class: 'step-intro' }, 'เช็คก่อนลงเวลานัดเต็ม — ระบบจะบอก "ขั้นถัดไปคืออะไร" ไม่ใช่ผ่าน/ไม่ผ่าน'),
      h('div', { class: 'field ap-f', style: 'margin-bottom:14px;max-width:320px' }, h('label', {}, 'ชื่อผู้มุ่งหวัง'), nameInput),
      h('div', { class: 'field-grid' }, ...manhaControls),

      h('div', { class: 'lead-block' },
        h('h2', { style: 'font-size:14.5px;margin-bottom:2px' }, 'การเข้าถึง'),
        h('div', { class: 'step-intro', style: 'margin:2px 0 12px' }, 'พยากรณ์อัตราปิดได้ดีกว่า MANHA เอง'),
        h('div', { class: 'field-grid' }, ...leadControls)),

      h('div', { class: 'pdpa-note' },
        icon('M8 2l5 2v4.2c0 2.6-2 4.6-5 5.8-3-1.2-5-3.2-5-5.8V4z', { size: 15, stroke: '#1550b8', width: 1.5, fill: 'none' }),
        h('div', {}, 'ข้อมูลนี้อยู่ในเครื่องของคุณ ยังไม่ถูกบันทึกลงระบบ — บันทึกได้เมื่อได้รับความยินยอมจากผู้มุ่งหวังแล้ว (ข้อมูลสุขภาพเป็นข้อมูลอ่อนไหวตาม PDPA)')),

      h('hr', { class: 'hr', style: 'margin:22px -34px' }),
      h('div', { class: 'form-nav' }, h('div', { class: 'spacer' }), evalBtn),
      resultSlot)
  );
}

function control(f, onChange, values) {
  let el;
  if (f.type === 'number') {
    el = h('input', { class: 'input n', type: 'text', inputmode: 'numeric', placeholder: f.placeholder || '',
      oninput: (e) => { values[f.key] = e.target.value.replace(/[^\d]/g, ''); e.target.value = values[f.key]; onChange(); } });
  } else {
    el = h('select', { class: 'input', onchange: (e) => { values[f.key] = e.target.value; onChange(); } },
      h('option', { value: '' }, '— เลือก —'),
      ...f.options.map((o) => h('option', { value: o.value }, o.label)));
  }
  const label = f.label.replace(/\s*\([A-Za-z]+\)$/, '');
  return h('div', { class: 'field ap-f' + (f.type === 'number' ? '' : ' span2') },
    h('label', {}, f.letter ? h('span', { class: 'manha-letter' }, f.letter) : null, label), el);
}

function readout(res, opts, values) {
  const wrap = h('div', { class: 'manha-result' });

  wrap.append(h('div', { class: 'manha-verdict', style: `--vt:${TONE[res.tone]}` },
    h('div', { class: 'mv-dot' }),
    h('div', {},
      h('div', { class: 'mv-head' }, res.headline),
      h('div', { class: 'mv-advice' }, 'ขั้นถัดไป: ' + res.nextStep),
      res.queue !== 'ปกติ' ? h('div', { class: 'mv-advice', style: 'margin-top:5px' },
        `คิว: ${res.queue}` + (res.queueReasons.length ? ` — ${res.queueReasons.join(' · ')}` : '')) : null,
      res.budget ? h('div', { class: 'mv-advice', style: 'margin-top:5px' }, `งบเบี้ย ~${res.budget.toLocaleString('th-TH')} บาท/เดือน`) : null)));

  wrap.append(h('div', { class: 'manha-dims' }, ...res.dimensions.map(dimRow)));

  const goFull = () => opts.onContinue?.({
    clientName: values.prospectName || '',
    age: values.age || '',
    premiumBudgetMonthly: values.budget || '',
  });

  wrap.append(h('div', { class: 'result-actions' },
    h('button', { class: 'btn btn-secondary', onclick: () => opts.onRestart?.() }, 'คัดกรองคนใหม่'),
    h('div', { style: 'flex:1' }),
    res.tone === 'stop'
      ? h('button', { class: 'btn btn-secondary', onclick: goFull }, 'ทำ Protection Gap ต่ออยู่ดี')
      : h('button', { class: 'btn btn-primary ap-fill', onclick: goFull }, 'ทำ Protection Gap ต่อ', icon(ICONS.chevron, { size: 13, width: 1.7 }))));

  if (res.tone !== 'go') {
    wrap.append(h('div', { class: 'followup-note' }, icon('M8 4v4l2.5 2.5', { size: 14, stroke: 'var(--ap-ink2)', width: 1.5 }),
      'ผู้มุ่งหวังที่ยัง "ไม่ใช่ตอนนี้" คือเคสในอนาคต — ตั้งเตือนติดตามใน 3 / 6 / 12 เดือน แล้วรักษาความสัมพันธ์ไว้ (จะทำในสมุดลูกค้า Module B)'));
  }
  return wrap;
}

function dimRow(d) {
  const m = STATUS_META[d.status];
  return h('div', { class: 'manha-dim' },
    h('div', { class: 'md-letter', style: `background:${m.dot}` }, d.letter),
    h('div', { class: 'md-body' },
      h('div', { class: 'md-top' }, h('span', { class: 'md-label' }, d.label), h('span', { class: `tag ${m.tag}` }, m.label)),
      d.note ? h('div', { class: 'md-note' }, d.note) : null));
}
