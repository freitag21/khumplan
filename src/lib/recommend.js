/**
 * แปลงผลวิเคราะห์ + โปรไฟล์ลูกค้า → รายการ "ประเภทประกันที่ควรพิจารณา" เรียงตามลำดับความสำคัญ
 *
 * หมายเหตุ compliance:
 * - แนะนำเป็น "ประเภท/หมวด" ของความคุ้มครองเท่านั้น ไม่ระบุชื่อแบบ/บริษัท ไม่รับประกันผลตอบแทน
 * - ยูนิตลิงก์เสนอต่อเมื่อลูกค้าระบุว่ารับความเสี่ยงการลงทุนได้เท่านั้น (ต้องทำแบบประเมินความเหมาะสมจริงก่อนขาย)
 * - ไม่สร้างรายการใหม่ "เพื่อใช้สิทธิลดหย่อน" — สิทธิภาษีเป็นเหตุผลเสริมของแบบที่ลูกค้าจำเป็นอยู่แล้ว
 */

const TYPE_LABELS = {
  health_lumpsum: 'ประกันสุขภาพแบบเหมาจ่าย',
  critical_illness: 'ประกันโรคร้ายแรง',
  term_life: 'ประกันชีวิตแบบคุ้มครองสูง (ชั่วระยะเวลา / เบี้ยจ่ายทิ้ง)',
  whole_life: 'ประกันชีวิตตลอดชีพ',
  pa_disability: 'ประกันอุบัติเหตุ / ทุพพลภาพ',
  pension: 'ประกันบำนาญ',
  savings_endowment: 'ประกันสะสมทรัพย์',
  unit_linked: 'ยูนิตลิงก์ (ความคุ้มครอง + ลงทุน)',
  education_savings: 'ประกันเพื่อทุนการศึกษาบุตร',
};

const PRIORITY = { high: 'ควรทำก่อน', medium: 'ควรพิจารณา', low: 'ทำเพิ่มเมื่อพร้อม' };
const RANK = { high: 0, medium: 1, low: 2 };

function short(v) {
  if (!Number.isFinite(v)) return '-';
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' ลบ.';
  return Math.round(v).toLocaleString('th-TH') + ' บาท';
}

export function recommend(result) {
  const { input, categories, tax } = result;
  const byKey = Object.fromEntries(categories.map((c) => [c.key, c]));
  const married = input.maritalStatus && input.maritalStatus !== 'single';
  const hasKids = (input.children || []).length > 0;
  const hasDependents = married || hasKids || input.supportsSpouse || input.supportsParents;
  const riskOk = input.riskTolerance === 'medium' || input.riskTolerance === 'high';
  const budget = Number(input.premiumBudgetMonthly) || 0;

  const items = [];
  const add = (type, priority, reason) => items.push({ type, label: TYPE_LABELS[type], priority, reason });
  const addOrAppend = (type, priority, reason) => {
    const found = items.find((i) => i.type === type);
    if (found) found.reason += ` • ${reason}`;
    else add(type, priority, reason);
  };

  // 1) สุขภาพ — ฐานของทุกพอร์ต
  if (byKey.health.status !== 'ok') {
    add('health_lumpsum', byKey.health.status === 'none' ? 'high' : 'medium',
      byKey.health.status === 'none'
        ? 'ยังไม่มีประกันสุขภาพส่วนตัว — ค่ารักษาพยาบาลเป็นความเสี่ยงที่กระทบเงินออมมากที่สุด'
        : `ค่าห้อง/วงเงินต่ำกว่าระดับ "${byKey.health.detail.targetLabel}" ที่ตั้งเป้าไว้`);
  }

  // 2) โรคร้ายแรง
  if (byKey.ci.status !== 'ok') {
    add('critical_illness', byKey.ci.status === 'none' ? 'high' : 'medium',
      `ยังขาดทุนก้อนกรณีเจ็บป่วยรุนแรงราว ${short(byKey.ci.gap)} — ทดแทนค่าใช้จ่ายช่วงพักฟื้นและส่วนค่ารักษาที่ประกันสุขภาพไม่ครอบคลุม`);
  }

  // 3) ชีวิต
  if (byKey.life.status !== 'ok') {
    if (hasDependents) {
      add('term_life', 'high', `มีผู้พึ่งพารายได้ และยังขาดทุนคุ้มครองราว ${short(byKey.life.gap)}`);
      if (byKey.life.detail?.groupLife > 0)
        addOrAppend('term_life', 'high', `ทุนกลุ่มจากที่ทำงานคุ้มครองเฉพาะระหว่างเป็นพนักงาน (ถ้าออกจากงานช่องว่างเป็น ${short(byKey.life.detail.gapIfLeaveJob)})`);
    } else {
      add('term_life', 'medium', `ขาดทุนคุ้มครองหนี้สิน + ค่าใช้จ่ายช่วงสุดท้ายราว ${short(byKey.life.gap)}`);
    }
  }

  // 4) อุบัติเหตุ / ทุพพลภาพ — ส่วนเสริมเบี้ยถูก
  if (byKey.accident.status !== 'ok') {
    add('pa_disability', byKey.accident.detail?.disabilityGapMonthly > 0 ? 'medium' : 'low',
      'เสริมความคุ้มครองอุบัติเหตุและกรณีทุพพลภาพสิ้นเชิงถาวร เบี้ยถูกเมื่อเทียบกับทุน');
  }

  // 5) เกษียณ
  const ret = byKey.retirement;
  if (ret.status !== 'ok') {
    const y = ret.detail?.yearsToRetire;
    if (ret.detail?.mode === 'decumulation') {
      add('savings_endowment', 'medium', 'เกษียณแล้วและเงินอาจไม่พอตลอดช่วงเกษียณ — ทบทวนการถอนใช้และพิจารณาแบบที่ให้กระแสเงินสดมั่นคง');
    } else if (Number.isFinite(y) && y >= 10) {
      add('pension', 'medium', `ขาดเงินเกษียณราว ${short(ret.gap)} — ยังมีเวลาสะสม ${y} ปี`);
      if (riskOk && Number(input.monthlyIncome) >= 40000)
        add('unit_linked', 'low', 'ลูกค้าระบุว่ารับความเสี่ยงลงทุนได้ และต้องการคุ้มครองชีวิตควบการลงทุนระยะยาว (ต้องทำแบบประเมินความเหมาะสมก่อน)');
    } else {
      add('savings_endowment', 'medium', 'ใกล้เกษียณ — เน้นสะสมทรัพย์ความเสี่ยงต่ำเพื่อเติมเงินก้อน');
    }
  }

  // 6) การศึกษาบุตร
  if (hasKids && byKey.education.status !== 'ok') {
    add('education_savings', 'high', `ขาดทุนการศึกษาบุตรราว ${short(byKey.education.gap)}`);
  }

  // 7) ภาษี — เหตุผลเสริมของแบบที่แนะนำอยู่แล้ว ไม่สร้างรายการใหม่
  if (tax.totalHeadroom > 0 && tax.marginalRate > 0 && tax.potentialTaxSaving > 0) {
    if (tax.pensionHeadroom > 0 && items.some((i) => i.type === 'pension'))
      addOrAppend('pension', 'medium', `ยังใช้สิทธิลดหย่อนบำนาญได้อีก ${short(tax.pensionHeadroom)} (ช่วยประหยัดภาษีในภาพรวม ~${short(tax.potentialTaxSaving)})`);
    if (tax.lifeHealthHeadroom > 0 && items.some((i) => i.type === 'term_life' || i.type === 'whole_life' || i.type === 'health_lumpsum'))
      addOrAppend(items.find((i) => i.type === 'whole_life') ? 'whole_life' : items.find((i) => i.type === 'term_life') ? 'term_life' : 'health_lumpsum',
        'medium', `เบี้ยส่วนนี้ยังใช้สิทธิลดหย่อนได้อีก ${short(tax.lifeHealthHeadroom)}`);
  }

  items.sort((a, b) => RANK[a.priority] - RANK[b.priority]);

  const list = items.map((it) => ({ ...it, priorityLabel: PRIORITY[it.priority] }));
  return budget > 0
    ? withBudgetNote(list, budget)
    : list;
}

function withBudgetNote(list, budget) {
  if (!list.length) return list;
  // ทำเครื่องหมายว่า "เริ่มที่นี่ก่อนในงบ" ให้รายการ high 1–2 อันแรก
  const firsts = list.filter((i) => i.priority === 'high').slice(0, 2);
  firsts.forEach((i) => (i.inBudget = true));
  list.budgetNote = `ลูกค้าระบุงบเบี้ยราว ${budget.toLocaleString('th-TH')} บาท/เดือน — เริ่มจากรายการ "ควรทำก่อน" ${firsts.length} อันแรกให้อยู่ในงบ ที่เหลือทยอยเพิ่มปีถัดไป`;
  return list;
}

export { TYPE_LABELS };
