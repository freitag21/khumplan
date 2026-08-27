import { h, icon, ICONS } from './dom.js';
import { recommend } from '../lib/recommend.js';
import { scoreGauge, sevRow, miniBars } from './charts.js';

const STATUS = {
  none: { pill: 'ยังไม่มีความคุ้มครอง', cls: 'st-none', tag: 'p-bad' },
  gap: { pill: 'มีช่องว่าง', cls: 'st-gap', tag: 'p-warn' },
  ok: { pill: 'เพียงพอ', cls: 'st-ok', tag: 'p-ok' },
};
const PRIO_TAG = { high: 'p-bad', medium: 'p-warn', low: 'p-info' };
const CHIP_TONE = { none: 'bad', gap: 'warn', ok: 'info' };

const g = (v) => (Number.isFinite(v) ? Math.round(v).toLocaleString('th-TH') : '-');
const THMONTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const thaiDate = (iso) => {
  const d = iso ? new Date(iso) : new Date();
  return `${d.getDate()} ${THMONTH[d.getMonth()]} ${d.getFullYear() + 543}`;
};

/**
 * @param {ReturnType<import('../lib/needs.js').analyze>} result
 * @param {{agent?:object, onEdit?:Function, onSave?:Function, onCopyLink?:Function, readOnly?:boolean}} opts
 */
export function renderResults(result, opts = {}) {
  const { categories, tax, summary, meta, input } = result;
  const recs = recommend(result);
  const byKey = Object.fromEntries(categories.map((c) => [c.key, c]));
  const agent = opts.agent && opts.agent.display_name ? opts.agent : null;
  const wrap = h('div', { class: 'result' });

  /* header */
  const sub = [
    `อายุ ${input.age} ปี`,
    input.sex === 'F' ? 'หญิง' : 'ชาย',
    maritalLabel(input.maritalStatus),
    input.children?.length ? `บุตร ${input.children.length} คน` : null,
  ].filter(Boolean);

  wrap.append(
    h('div', { class: 'result-head' },
      h('div', { style: 'flex:1' },
        h('div', { class: 'result-kicker' }, 'รายงานวิเคราะห์ความคุ้มครอง'),
        h('h1', {}, input.clientName ? `Protection Gap — ${input.clientName}` : 'Protection Gap'),
        h('div', { class: 'result-sub' }, sub.join(' · '), h('span', { class: 'sep' }, '|'), `จัดทำ ${thaiDate(meta.generatedAt)}`)),
      agent ? h('div', { class: 'agent-badge' },
        h('div', { class: 'pic' }, 'รูป'),
        h('div', {},
          h('div', { class: 'role' }, 'ตัวแทนผู้จัดทำ'),
          h('div', { class: 'nm' }, agent.display_name),
          agent.line_id ? h('div', { class: 'ln' }, `LINE: ${agent.line_id}`) : null,
          agent.license_no ? h('div', { class: 'ln' }, `ใบอนุญาตเลขที่ ${agent.license_no}`) : null)) : null
    ),
    h('hr', { class: 'hr', style: 'margin:0' })
  );

  /* dark summary band */
  const chips = summary.priorityOrder.slice(0, 3).map((k) => {
    const c = byKey[k];
    return h('span', { class: `prio-chip ${CHIP_TONE[c.status] || 'warn'}` }, c.label);
  });
  wrap.append(
    h('div', { class: 'summary' },
      h('div', { class: 'summary-grid' },
        h('div', { class: 'summary-gauge' },
          scoreGauge(summary.overallScore),
          h('div', { class: 'lbl' }, `คะแนนความพร้อม · ${summary.overallLevel}`)),
        h('div', { class: 'summary-div' }),
        h('div', { class: 'summary-main' },
          ...firstStepBlock(summary),
          h('div', { class: 'summary-refs' },
            refPill('ทุนคุ้มครองที่ยังขาด', summary.protectionGap),
            refPill('เป้าหมายเงินออมที่ยังขาด', summary.savingsGap),
            summary.monthlySavingNeeded > 0 ? refPill('ออมครบทุกเป้าหมาย/เดือน', summary.monthlySavingNeeded) : null),
          chips.length ? h('div', { class: 'prio-cap' }, `${chips.length} ด้านที่ควรเร่งวางแผน`) : null,
          chips.length ? h('div', { class: 'prio-chips' }, ...chips) : null)
      )
    )
  );

  /* strengths */
  if (summary.strengths?.length) {
    wrap.append(h('div', { class: 'strength-card' },
      h('div', { class: 'strength-head' }, icon('M3 8.5l3.5 3.5L13 4', { size: 15, stroke: 'var(--ap-ok)', width: 1.8 }), 'จุดที่ทำไว้ดีแล้ว'),
      h('ul', {}, ...summary.strengths.map((s) => h('li', {}, s)))));
  }

  /* severity bars */
  const applicable = categories.filter((c) => c.applicable !== false);
  const sorted = [...applicable].sort((a, b) => b.severity - a.severity);
  wrap.append(h('div', { class: 'section' },
    h('h2', {}, 'ระดับช่องว่างแต่ละด้าน'),
    h('div', { class: 'section-hint' }, 'แถบยาวกว่า = ควรวางแผนก่อน (0–100) · อุบัติเหตุ/ทุพพลภาพเป็นส่วนเสริม ไม่รวมในช่องว่างรวม'),
    h('div', { class: 'sev-list' }, ...sorted.map((c) => sevRow(c.label, c.severity, c.status === 'ok')))));

  /* category cards */
  wrap.append(h('div', { class: 'section' },
    h('h2', { style: 'margin-bottom:14px' }, 'รายละเอียดแต่ละด้าน'),
    h('div', { class: 'cat-grid' }, ...applicable.map(catCard))));

  /* recommendations + tax */
  wrap.append(h('div', { class: 'rec-tax' },
    h('div', {},
      h('h2', { style: 'font-size:17px' }, 'ประเภทประกันที่ควรพิจารณา'),
      h('div', { class: 'section-hint', style: 'margin-bottom:12px' }, 'เป็นประเภทความคุ้มครอง ไม่ใช่ชื่อแบบประกันหรือชื่อบริษัท'),
      recs.budgetNote ? h('div', { class: 'budget-note' }, recs.budgetNote) : null,
      recs.length
        ? h('div', { class: 'rec-list' }, ...interpose(recs.map(recRow), () => h('hr', { class: 'hr', style: 'margin:0 -16px' })))
        : h('div', { class: 'card ap-g elev-sm' }, h('div', { class: 'cat-note' }, 'ความคุ้มครองครบทุกด้านตามข้อมูลที่กรอก'))),
    taxCard(tax)));

  /* actions */
  if (!opts.readOnly) {
    const actions = h('div', { class: 'result-actions ap-noprint' },
      h('button', { class: 'btn btn-secondary', onclick: () => opts.onEdit?.() }, icon(ICONS.back), 'แก้ไขข้อมูล'),
      h('div', { style: 'flex:1' }));
    if (opts.onCopyLink) actions.append(h('button', { class: 'btn btn-secondary', onclick: () => opts.onCopyLink() }, 'คัดลอกลิงก์แชร์'));
    if (opts.onSave) actions.append(h('button', { class: 'btn btn-secondary', onclick: () => opts.onSave() }, 'บันทึกผลวิเคราะห์'));
    actions.append(h('button', { class: 'btn btn-primary ap-fill', onclick: () => window.print() }, icon(ICONS.print), 'พิมพ์ / บันทึก PDF'));
    wrap.append(actions);
  }

  /* disclaimer + assumptions */
  wrap.append(h('div', { class: 'disclaimer' }, infoCircle(),
    h('div', {},
      meta.disclaimer,
      agent ? h('div', { style: 'margin-top:4px' }, `จัดทำโดย ${agent.display_name}${agent.license_no ? ` · ใบอนุญาตเลขที่ ${agent.license_no}` : ''} · เอกสารนี้ไม่ใช่ส่วนหนึ่งของสัญญาประกันภัย`) : null,
      assumptionsLine(input, meta))));

  return wrap;

  /* ---------- pieces ---------- */
  function catCard(c) {
    const m = STATUS[c.status];
    const card = h('div', { class: `card ap-g elev-sm cat-card ${m.cls}` },
      h('div', { class: 'cat-card-head' }, h('h3', {}, c.label),
        h('span', { class: `tag ${m.tag}` }, c.excludeFromTotal ? 'ส่วนเสริม' : m.pill)));

    if (c.key === 'health') {
      const d = c.detail;
      card.append(h('div', { class: 'health-stats' },
        healthStat('ค่าห้อง / วัน', d.currentRoom, d.targetRoom),
        healthStat('เหมาจ่าย / ปี', d.currentAnnualLimit, d.targetAnnualLimit)));
      if (d.stateLabel) card.append(h('div', { class: 'cat-note', style: 'margin-top:2px' }, `หักสิทธิ ${d.stateLabel} แล้ว`));
      card.append(h('hr', { class: 'hr', style: 'margin:2px -17px' }));
    } else if (c.key === 'retirement' && c.detail.mode === 'decumulation') {
      const d = c.detail;
      card.append(h('ul', { class: 'kv' },
        kv('เงินที่มี', g(c.have)),
        kv('ใช้เดือนละ (สุทธิ)', g(d.netMonthlyToday)),
        kv('ใช้ได้ราว', d.potLastsYears === Infinity ? 'เพียงพอ' : `${d.potLastsYears} ปี`, d.potLastsYears === Infinity ? 'var(--ap-ok)' : 'var(--ap-warn)')));
    } else {
      card.append(miniBars(c.have, c.need));
      card.append(h('hr', { class: 'hr', style: 'margin:2px -17px' }));
      card.append(h('div', {},
        kv('มีอยู่', g(c.have)),
        kv('ควรมี', g(c.need)),
        kv('ช่องว่าง', g(c.gap), c.gap > 0 ? 'var(--ap-bad)' : 'var(--ap-ok)')));
    }

    const monthly = c.detail?.monthlySavingNeeded;
    if (monthly > 0) {
      const verb = c.key === 'education' ? 'เก็บเพิ่มประมาณ' : 'ออมเพิ่มประมาณ';
      card.append(h('div', { class: 'action-pill' }, icon(ICONS.plus, { size: 14, stroke: '#1550b8' }),
        verb, ' ', h('b', { class: 'n' }, g(monthly)), ' บาท/เดือน'));
    }
    if (c.key === 'education' && c.detail.annualSchoolFeeToday > 0) {
      card.append(h('div', { class: 'cat-note' }, `+ ค่าเทอมโรงเรียนปีละ ~${g(c.detail.annualSchoolFeeToday)} บาท (เตรียมจากกระแสเงินสด)`));
    }
    for (const nt of c.notes || []) card.append(h('div', { class: 'cat-note' }, nt));
    return card;
  }

  function taxCard(t) {
    return h('div', {},
      h('h2', { style: 'font-size:17px' }, 'สิทธิลดหย่อนภาษีที่เหลือ'),
      h('div', { class: 'section-hint', style: 'margin-bottom:12px' }, `ประมาณการจากเกณฑ์ปีภาษี ${t.taxYear}${t.usedDirectEntry ? ' (ใช้เงินได้สุทธิที่กรอก)' : ''}`),
      h('div', { class: 'card ap-g elev-sm tax-card' },
        h('div', { class: 'tax-big' }, h('span', { class: 'k' }, 'อัตราภาษีขั้นสูงสุด (ประมาณ)'), h('span', { class: 'v n' }, `${Math.round(t.marginalRate * 100)}%`)),
        h('hr', { class: 'hr', style: 'margin:11px -17px' }),
        kv('ประกันชีวิต/สุขภาพ ใช้ได้อีก', g(t.lifeHealthHeadroom)),
        kv('ประกันบำนาญ ใช้ได้อีก', g(t.pensionHeadroom)),
        t.retirementCombinedRemaining < 500000 ? kv('เพดานรวมกลุ่มเกษียณเหลือ', g(t.retirementCombinedRemaining)) : null,
        h('hr', { class: 'hr', style: 'margin:11px -17px' }),
        h('div', { class: 'tax-big tax-save' }, h('span', { class: 'k' }, 'ประหยัดภาษีได้อีกราว'), h('span', { class: 'v n' }, g(t.potentialTaxSaving))),
        h('div', { class: 'tax-note' }, (t.notes || []).slice(0, 2).join(' · '))));
  }
}

function recRow(r) {
  return h('div', { class: 'rec-row' + (r.inBudget ? ' in-budget' : '') },
    h('span', { class: `tag ${PRIO_TAG[r.priority]}` }, r.priorityLabel),
    h('div', {},
      h('div', { class: 'rt' }, r.label, r.inBudget ? h('span', { class: 'tag p-ok', style: 'margin-left:6px' }, 'เริ่มในงบ') : null),
      h('div', { class: 'rd' }, r.reason)));
}

function firstStepBlock(summary) {
  const fs = summary.firstStep;
  if (!fs) {
    return [
      h('div', { class: 'cap' }, 'สถานะโดยรวม'),
      h('div', { class: 'summary-total n' }, summary.overallLevel),
    ];
  }
  if (fs.monthly > 0) {
    return [
      h('div', { class: 'cap' }, `ก้าวแรก — เริ่มที่ "${fs.label}" ออมเดือนละ`),
      h('div', { class: 'summary-total n' }, g(fs.monthly), h('span', { class: 'unit' }, 'บาท/เดือน')),
    ];
  }
  return [
    h('div', { class: 'cap' }, `ก้าวแรก — เริ่มที่ "${fs.label}" ต้องการทุนคุ้มครองเพิ่ม`),
    h('div', { class: 'summary-total n' }, g(fs.lumpGap), h('span', { class: 'unit' }, 'บาท')),
  ];
}

function refPill(label, value) {
  return h('div', { class: 'ref-pill' }, h('span', {}, label), h('b', { class: 'n' }, Number.isFinite(value) ? Math.round(value).toLocaleString('th-TH') : '-'));
}
function healthStat(label, cur, target) {
  return h('div', { class: 'health-stat' }, h('div', { class: 'k' }, label), h('div', { class: 'v n' }, g(cur)), h('div', { class: 't' }, `เป้า ${g(target)}`));
}
function kv(k, v, color) {
  return h('div', { class: 'kv' }, h('span', {}, k), h('b', { class: 'n', style: color ? `color:${color}` : null }, v));
}
function interpose(nodes, sep) {
  const out = [];
  nodes.forEach((n2, i) => { if (i) out.push(sep()); out.push(n2); });
  return out;
}
function maritalLabel(s) {
  return { single: 'โสด', married: 'สมรส', divorced: 'หย่า', widowed: 'หม้าย', single_parent: 'เลี้ยงบุตรคนเดียว' }[s] || 'โสด';
}
function assumptionsLine(input, meta) {
  const o = input.overrides;
  const parts = [`สมมติฐานเวอร์ชัน ${meta.assumptionsVersion}`];
  if (o && Object.keys(o).length) {
    const names = { medicalInflation: 'เงินเฟ้อค่ารักษา', preRetireReturn: 'ผลตอบแทนก่อนเกษียณ', postRetireReturn: 'ผลตอบแทนหลังเกษียณ', lifeExpectancy: 'วางแผนถึงอายุ', consumptionFactor: 'สัดส่วนทดแทนรายได้', yearsToSupport: 'ปีที่พึ่งพา', finalExpenses: 'ค่าใช้จ่ายช่วงสุดท้าย' };
    parts.push('ปรับ: ' + Object.entries(o).map(([k, v]) => `${names[k] || k} = ${k.includes('Return') || k.includes('Factor') || k.includes('Inflation') ? +(v * 100).toFixed(1) + '%' : Math.round(v).toLocaleString('th-TH')}`).join(', '));
  }
  return h('div', { style: 'margin-top:4px;font-size:10px' }, parts.join(' · '));
}
function infoCircle() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', 15); svg.setAttribute('height', 15); svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', '#5b6875'); svg.setAttribute('stroke-width', 1.4);
  const c = document.createElementNS(NS, 'circle');
  c.setAttribute('cx', 8); c.setAttribute('cy', 8); c.setAttribute('r', 6.4);
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', 'M8 7.2v4M8 4.9v.7'); p.setAttribute('stroke-linecap', 'round');
  svg.append(c, p);
  return svg;
}
