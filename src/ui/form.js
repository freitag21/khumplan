import { SECTIONS, CHILD_PLAN_OPTIONS, CHILD_SCHOOL_OPTIONS } from '../lib/questionnaire.js';
import { h, icon, ICONS, brand } from './dom.js';

const SAMPLE = {
  clientName: 'สมชาย ใจดี', age: 35, sex: 'M', maritalStatus: 'married', occupation: 'พนักงานบริษัทเอกชน',
  businessOwner: false, smoker: false,
  children: [{ age: 5, plan: 'local_private', schoolType: 'bilingual' }, { age: 8, plan: 'local_public', schoolType: 'none' }],
  supportsSpouse: true, spouseHasIncome: true, spouseIncomeShare: 40,
  supportsParents: true, parentSupportMonthly: 8000, parentSupportYears: 15,
  monthlyIncome: 60000, otherAnnualIncome: 120000, monthlyHouseholdExpense: 40000,
  totalDebt: 2500000, liquidAssets: 600000, premiumBudgetMonthly: 5000,
  existingLifeSum: 1000000, existingHealthRoom: 0, existingHealthAnnual: 0, existingHealthCopay: false,
  existingCiSum: 0, existingPaSum: 500000, hasDisabilityIncome: 'no',
  existingRetirementSavings: 800000, existingEducationSavings: 200000,
  stateHealth: 'sso', groupLifeSum: 1000000, groupHealthRoom: 2000, groupHealthAnnual: 500000,
  groupHasCi: false, pvdMonthlyContribution: 6000, ssoPensionMonthly: 4000, rmfSsfPvdAnnual: 72000,
  retireAge: 60, hospitalTier: 'private_standard', lifeHealthPremiumPaid: 30000, pensionPremiumPaid: 0,
  parentsInCare: 2, mortgageInterestPaid: 90000, riskTolerance: 'unknown',
};

const OVERRIDE_FIELDS = [
  { key: 'medicalInflation', label: 'เงินเฟ้อค่ารักษาพยาบาล (%)', kind: 'pct', def: 9 },
  { key: 'preRetireReturn', label: 'ผลตอบแทนก่อนเกษียณ (%)', kind: 'pct', def: null },
  { key: 'postRetireReturn', label: 'ผลตอบแทนหลังเกษียณ (%)', kind: 'pct', def: 3 },
  { key: 'lifeExpectancy', label: 'วางแผนถึงอายุ', kind: 'int', def: null },
  { key: 'consumptionFactor', label: 'สัดส่วนทดแทนรายได้ (%)', kind: 'pct', def: 70 },
  { key: 'yearsToSupport', label: 'ปีที่ครอบครัวต้องพึ่งพา', kind: 'int', def: null },
  { key: 'finalExpenses', label: 'ค่าใช้จ่ายช่วงสุดท้าย (บาท)', kind: 'money', def: 300000 },
];

export function buildForm({ onSubmit } = {}) {
  const fieldEls = {};
  const state = { step: 0, children: [], overrides: {} };
  const stepCount = SECTIONS.length;

  const stepperEl = h('div', { class: 'stepper' });
  const progressEl = h('div', { class: 'progress' }, h('div'));
  const panelsEl = h('div', {});
  const navEl = h('div', { class: 'form-nav' });

  const card = h('div', { class: 'form-card' },
    h('div', { class: 'form-card-head' }, brand(21),
      h('span', { class: 'draft' }, 'ร่างอัตโนมัติ'),
      h('button', { class: 'btn btn-secondary', type: 'button', style: 'padding:6px 11px;font-size:12.5px', onclick: () => loadSample() }, 'ใส่ข้อมูลตัวอย่าง')),
    h('div', { class: 'form-body' }, stepperEl, progressEl, panelsEl,
      h('hr', { class: 'hr', style: 'margin:22px -34px' }), navEl)
  );

  /* children */
  const childrenWrap = h('div', { class: 'kids' });
  function renderChildren() {
    childrenWrap.innerHTML = '';
    state.children.forEach((child, i) => {
      childrenWrap.append(
        h('div', { class: 'kid-row kid-row-3' },
          h('span', { class: 'kn n' }, String(i + 1)),
          h('div', { class: 'field ap-f' }, h('label', {}, 'อายุ (ปี)'),
            h('input', { class: 'input n', type: 'text', inputmode: 'numeric', value: child.age ?? '', style: 'min-height:34px',
              oninput: (e) => { child.age = e.target.value.replace(/[^\d]/g, ''); e.target.value = child.age; } })),
          h('div', { class: 'field ap-f' }, h('label', {}, 'แผนมหาวิทยาลัย'),
            selectEl(CHILD_PLAN_OPTIONS, child.plan || 'local_public', (v) => { child.plan = v; }, true)),
          h('div', { class: 'field ap-f' }, h('label', {}, 'โรงเรียน (K-12)'),
            selectEl(CHILD_SCHOOL_OPTIONS, child.schoolType || 'none', (v) => { child.schoolType = v; }, true)),
          h('button', { class: 'btn btn-secondary btn-mini', type: 'button', title: 'ลบ',
            onclick: () => { state.children.splice(i, 1); renderChildren(); } }, icon(ICONS.minus, { size: 13 }))
        )
      );
    });
    childrenWrap.append(
      h('button', { class: 'btn btn-primary', type: 'button', style: 'margin-top:10px',
        onclick: () => { state.children.push({ age: '', plan: 'local_public', schoolType: 'none' }); renderChildren(); } },
        icon(ICONS.plus, { size: 13, width: 1.7 }), 'เพิ่มบุตร')
    );
  }
  renderChildren();

  /* panels */
  const panels = SECTIONS.map((section, si) => {
    const grid = h('div', { class: 'field-grid' });
    for (const f of section.fields) {
      if (f.type === 'children') {
        grid.append(h('div', { class: 'span2', style: 'margin-top:6px' },
          h('div', { style: 'display:flex;align-items:baseline;gap:10px;margin-bottom:10px' },
            h('h2', { style: 'font-size:14.5px' }, 'บุตร'),
            h('span', { class: 'muted', style: 'font-size:12px' }, 'เพิ่มได้ตามจำนวนบุตร')),
          childrenWrap));
        continue;
      }
      const control = makeControl(f);
      fieldEls[f.key] = control;
      const span = f.type === 'select' || f.type === 'checkbox' || (f.label && f.label.length > 40);
      const field = h('div', { class: 'field ap-f' + (span ? ' span2' : '') + (f.type === 'checkbox' ? ' is-check' : '') },
        f.type === 'checkbox' ? null : h('label', {}, f.label),
        control.el);
      if (f.showIf) { field.dataset.showif = '1'; field._dep = f; }
      grid.append(field);
    }

    const panel = h('div', { hidden: si !== 0 },
      h('h1', {}, section.title.replace(/^\d+\.\s*/, '')),
      h('div', { class: 'step-intro' }, section.hint || hintFor(section.id)),
      grid
    );
    if (section.id === 'client') panel.append(pdpaNote());
    if (section.id === 'goals') panel.append(overridePanel());
    return panel;
  });
  panels.forEach((p) => panelsEl.append(p));

  renderStepper();
  renderNav();
  refreshConditional();
  return { element: card, getValues, setValues, loadSample };

  /* ---------- steps ---------- */
  function goto(nStep) {
    state.step = Math.max(0, Math.min(stepCount - 1, nStep));
    panels.forEach((p, i) => (p.hidden = i !== state.step));
    renderStepper(); renderNav();
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function renderStepper() {
    stepperEl.innerHTML = '';
    SECTIONS.forEach((sec, i) => {
      if (i) stepperEl.append(h('div', { class: 'step-line' }));
      const cls = i < state.step ? 'done' : i === state.step ? 'active' : '';
      stepperEl.append(h('div', { class: `step ${cls}` }, h('div', { class: 'num n' }, String(i + 1)), h('span', { class: 'nm' }, shortTitle(sec))));
    });
    progressEl.firstChild.style.width = `${((state.step + 1) / stepCount) * 100}%`;
  }
  function renderNav() {
    navEl.innerHTML = '';
    navEl.append(
      h('button', { class: 'btn btn-secondary', type: 'button', style: 'color:var(--ap-ink2)', disabled: state.step === 0, onclick: () => goto(state.step - 1) }, 'ย้อนกลับ'),
      h('div', { class: 'spacer' }),
      h('span', { class: 'count' }, `ขั้นที่ ${state.step + 1} จาก ${stepCount}`)
    );
    if (state.step < stepCount - 1) {
      navEl.append(h('button', { class: 'btn btn-primary ap-fill', type: 'button', onclick: () => goto(state.step + 1) },
        `ถัดไป: ${shortTitle(SECTIONS[state.step + 1])}`, icon(ICONS.chevron, { size: 13, width: 1.7 })));
    } else {
      navEl.append(h('button', { class: 'btn btn-primary ap-fill', type: 'button', onclick: () => onSubmit?.(getValues()) }, 'วิเคราะห์ Protection Gap'));
    }
  }

  /* ---------- values ---------- */
  function getValues() {
    const out = { children: state.children.map((c) => ({ age: c.age, plan: c.plan, schoolType: c.schoolType })), overrides: buildOverrides() };
    for (const [k, ctl] of Object.entries(fieldEls)) out[k] = ctl.value();
    return out;
  }
  function setValues(v) {
    for (const [k, ctl] of Object.entries(fieldEls)) if (v[k] != null) ctl.set(v[k]);
    if (Array.isArray(v.children)) { state.children = v.children.map((c) => ({ ...c })); renderChildren(); }
    if (v.overrides && typeof v.overrides === 'object') {
      for (const f of OVERRIDE_FIELDS) {
        const raw = v.overrides[f.key];
        const el = state.overrides[f.key];
        if (el != null && Number.isFinite(raw)) el.value = f.kind === 'pct' ? +(raw * 100).toFixed(2) : raw;
      }
    }
    refreshConditional();
  }
  function loadSample() { setValues(SAMPLE); goto(0); }

  function buildOverrides() {
    const o = {};
    for (const f of OVERRIDE_FIELDS) {
      const el = state.overrides[f.key];
      if (!el || el.value === '') continue;
      const raw = Number(String(el.value).replace(/[^\d.]/g, ''));
      if (!Number.isFinite(raw)) continue;
      o[f.key] = f.kind === 'pct' ? raw / 100 : raw;
    }
    return Object.keys(o).length ? o : undefined;
  }

  function refreshConditional() {
    const v = getValues();
    panelsEl.querySelectorAll('[data-showif]').forEach((field) => {
      field.style.display = field._dep?.showIf?.(v) ? '' : 'none';
    });
  }

  /* ---------- controls ---------- */
  function makeControl(f) {
    if (f.type === 'radio') {
      const seg = h('div', { class: 'seg' });
      const inputs = [];
      f.options.forEach((o) => {
        const input = h('input', { type: 'radio', name: 'r_' + f.key, value: o.value });
        if ((f.default ?? f.options[0].value) === o.value) input.checked = true;
        input.addEventListener('change', () => { sync(); refreshConditional(); });
        inputs.push(input);
        seg.append(h('label', { class: 'seg-opt' }, input, o.label));
      });
      const sync = () => inputs.forEach((i) => i.closest('.seg-opt').classList.toggle('on', i.checked));
      sync();
      return { el: seg, value: () => inputs.find((i) => i.checked)?.value ?? f.default ?? '', set: (val) => { inputs.forEach((i) => (i.checked = i.value === String(val))); sync(); } };
    }
    if (f.type === 'checkbox') {
      const input = h('input', { type: 'checkbox' });
      input.addEventListener('change', refreshConditional);
      const wrap = h('label', { class: 'check' }, input, h('span', {}, f.label));
      return { el: wrap, value: () => input.checked, set: (v) => { input.checked = !!v && v !== 'false'; } };
    }
    if (f.type === 'select') {
      const opts = f.options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
      const sel = selectEl(opts, f.default ?? opts[0].value, () => refreshConditional());
      return { el: sel, value: () => sel.value, set: (v) => (sel.value = v) };
    }
    const money = f.type === 'money';
    const input = h('input', {
      class: 'input' + (money || f.type === 'number' ? ' n' : ''),
      type: 'text', inputmode: money || f.type === 'number' ? 'numeric' : null,
      placeholder: f.placeholder || (money ? 'บาท' : ''),
    });
    if (f.default != null) input.value = f.default;
    if (money || f.type === 'number') {
      input.addEventListener('input', () => {
        const raw = input.value.replace(/[^\d]/g, '');
        input.value = raw && money ? Number(raw).toLocaleString('th-TH') : raw;
      });
      if (f.type === 'number') input.addEventListener('change', refreshConditional);
    }
    return {
      el: input,
      value: () => input.value,
      set: (v) => {
        if (v == null || v === '') { input.value = ''; return; }
        const raw = String(v).replace(/[^\d.-]/g, '');
        input.value = money && raw !== '' && Number.isFinite(+raw) ? Number(raw).toLocaleString('th-TH') : String(v);
      },
    };
  }

  function overridePanel() {
    const body = h('div', { class: 'override-grid' });
    for (const f of OVERRIDE_FIELDS) {
      const input = h('input', { class: 'input n', type: 'text', inputmode: 'decimal',
        placeholder: f.def != null ? String(f.def) : 'ค่าเริ่มต้น' });
      state.overrides[f.key] = input;
      body.append(h('div', { class: 'field ap-f' }, h('label', {}, f.label), input));
    }
    const d = h('details', { class: 'override' },
      h('summary', {}, 'ปรับสมมติฐาน (ขั้นสูง) — เว้นว่างเพื่อใช้ค่าเริ่มต้น'),
      body,
      h('div', { class: 'muted', style: 'font-size:11px;margin-top:8px' }, 'ค่าที่ปรับจะถูกบันทึกไปกับผลวิเคราะห์และพิมพ์ลงท้ายรายงาน'));
    return d;
  }
}

/* ---------- helpers ---------- */
function selectEl(options, value, onChange, small) {
  const sel = h('select', { class: 'input' + (small ? '' : ''), style: small ? 'min-height:34px' : null, onchange: (e) => onChange?.(e.target.value) });
  for (const o of options) {
    const opt = h('option', { value: o.value }, o.label);
    if (String(value) === String(o.value)) opt.selected = true;
    sel.append(opt);
  }
  return sel;
}
function shortTitle(sec) {
  return ({ client: 'ข้อมูลลูกค้า', dependents: 'ผู้อยู่ในอุปการะ', income: 'รายได้และภาระ', coverage: 'ความคุ้มครองที่มี', benefits: 'สวัสดิการ/สิทธิรัฐ', goals: 'เป้าหมาย' })[sec.id]
    || sec.title.replace(/^\d+\.\s*/, '');
}
function hintFor(id) {
  return ({
    client: 'ใช้สำหรับคำนวณทุนที่ควรมีในแต่ละด้าน',
    income: 'ตัวเลขรายได้และภาระใช้กำหนดขนาดความคุ้มครองที่เหมาะสม',
    coverage: 'รวมทุกกรมธรรม์ส่วนตัว · ช่องที่ไม่มีให้ใส่ 0',
    goals: 'ปรับได้ตามความต้องการของลูกค้า',
  })[id] || '';
}
function pdpaNote() {
  return h('div', { class: 'pdpa-note' },
    icon('M8 2l5 2v4.2c0 2.6-2 4.6-5 5.8-3-1.2-5-3.2-5-5.8V4z', { size: 15, stroke: 'var(--ap-pri-ink)', width: 1.5, fill: 'none' }),
    h('div', {}, 'ตามนโยบาย PDPA กรุณาแจ้งวัตถุประสงค์และขอความยินยอมจากลูกค้าก่อนบันทึกข้อมูลเข้าระบบ · ข้อมูลที่แชร์ให้ลูกค้าจะแสดงเฉพาะที่จำเป็นต่อการวางแผน'));
}

export { h };
