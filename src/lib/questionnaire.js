import { HEALTH_TARGETS, STATE_HEALTH, EDUCATION_PRESETS, SCHOOL_PRESETS } from './assumptions.js';

const optList = (obj) => Object.entries(obj).map(([value, v]) => ({ value, label: v.label }));

/**
 * โครงแบบสอบถาม (ตัวแทนกรอกเอง) — 5 ขั้น
 * type: text | number | money | select | radio | checkbox | children
 */
export const SECTIONS = [
  {
    id: 'client',
    title: '1. ข้อมูลลูกค้า',
    fields: [
      { key: 'clientName', label: 'ชื่อ-นามสกุลลูกค้า (สำหรับหัวรายงาน)', type: 'text', placeholder: 'เช่น คุณสมชาย' },
      { key: 'age', label: 'อายุ (ปี)', type: 'number', min: 1, max: 90, required: true },
      { key: 'sex', label: 'เพศ', type: 'radio', default: 'M',
        options: [{ value: 'M', label: 'ชาย' }, { value: 'F', label: 'หญิง' }] },
      { key: 'maritalStatus', label: 'สถานะครอบครัว', type: 'select', default: 'single',
        options: [
          { value: 'single', label: 'โสด' },
          { value: 'married', label: 'สมรส' },
          { value: 'divorced', label: 'หย่า' },
          { value: 'widowed', label: 'หม้าย' },
          { value: 'single_parent', label: 'เลี้ยงบุตรคนเดียว' },
        ] },
      { key: 'occupation', label: 'อาชีพ', type: 'select',
        options: ['พนักงานบริษัทเอกชน', 'ข้าราชการ / รัฐวิสาหกิจ', 'เจ้าของกิจการ', 'อาชีพอิสระ / ฟรีแลนซ์', 'เกษตรกร', 'อื่น ๆ'] },
      { key: 'businessOwner', label: 'เป็นเจ้าของกิจการ / มีหนี้ที่ค้ำประกันในนามส่วนตัว', type: 'checkbox' },
      { key: 'smoker', label: 'สูบบุหรี่', type: 'checkbox' },
      { key: 'children', label: 'บุตร', type: 'children' },
    ],
  },
  {
    id: 'dependents',
    title: '2. ผู้อยู่ในอุปการะ',
    hint: 'ใช้กำหนดว่าต้อง "ทดแทนรายได้" หรือแค่ "คุ้มครองหนี้สิน"',
    fields: [
      { key: 'supportsSpouse', label: 'มีคู่สมรสที่พึ่งพารายได้ของลูกค้า', type: 'checkbox' },
      { key: 'spouseHasIncome', label: 'คู่สมรสมีรายได้ของตัวเอง', type: 'checkbox' },
      { key: 'spouseIncomeShare', label: 'ถ้าลูกค้าจากไป คู่สมรสรับภาระค่าใช้จ่ายครัวเรือนได้กี่ % (0–100)', type: 'number', min: 0, max: 100 },
      { key: 'supportsParents', label: 'ส่งเสียบิดา/มารดา หรือญาติ', type: 'checkbox' },
      { key: 'parentSupportMonthly', label: 'ถ้าส่งเสีย: จำนวนเงินต่อเดือน', type: 'money', showIf: (v) => v.supportsParents },
      { key: 'parentSupportYears', label: 'ถ้าส่งเสีย: คาดว่าอีกกี่ปี', type: 'number', min: 0, max: 40, showIf: (v) => v.supportsParents },
    ],
  },
  {
    id: 'income',
    title: '3. รายได้ ภาระ และงบเบี้ย',
    fields: [
      { key: 'monthlyIncome', label: 'รายได้ต่อเดือน', type: 'money', required: true },
      { key: 'otherAnnualIncome', label: 'รายได้อื่นต่อปี (โบนัส ฯลฯ)', type: 'money' },
      { key: 'monthlyHouseholdExpense', label: 'ค่าใช้จ่ายครัวเรือนต่อเดือน', type: 'money', required: true },
      { key: 'totalDebt', label: 'หนี้สินคงค้างรวม (บ้าน รถ บัตร ฯลฯ)', type: 'money' },
      { key: 'personalGuaranteeDebt', label: 'หนี้กิจการที่ค้ำประกันในนามส่วนตัว', type: 'money', showIf: (v) => v.businessOwner },
      { key: 'liquidAssets', label: 'สินทรัพย์สภาพคล่อง (เงินฝาก กองทุน หุ้น ที่ไม่ได้กันไว้เกษียณ/การศึกษา)', type: 'money' },
      { key: 'premiumBudgetMonthly', label: 'งบเบี้ยที่ลูกค้ารับได้ต่อเดือน (ถ้าทราบ)', type: 'money' },
    ],
  },
  {
    id: 'coverage',
    title: '4. ความคุ้มครองส่วนตัวที่มีอยู่',
    hint: 'เฉพาะกรมธรรม์ส่วนตัว (สวัสดิการบริษัทกรอกในขั้นถัดไป) · ไม่มีให้ใส่ 0',
    fields: [
      { key: 'existingLifeSum', label: 'ทุนประกันชีวิตส่วนตัวรวม', type: 'money' },
      { key: 'existingHealthRoom', label: 'ประกันสุขภาพส่วนตัว: ค่าห้อง/วัน', type: 'money' },
      { key: 'existingHealthAnnual', label: 'ประกันสุขภาพส่วนตัว: วงเงินเหมาจ่าย/ปี', type: 'money' },
      { key: 'existingHealthCopay', label: 'แผนสุขภาพเดิมมีความรับผิดส่วนแรก (copay / deductible)', type: 'checkbox' },
      { key: 'existingCiSum', label: 'ทุนประกันโรคร้ายแรงส่วนตัวรวม', type: 'money' },
      { key: 'existingPaSum', label: 'ทุนประกันอุบัติเหตุ (PA) ส่วนตัวรวม', type: 'money' },
      { key: 'hasDisabilityIncome', label: 'มีความคุ้มครองทุพพลภาพ / ชดเชยรายได้', type: 'radio', default: 'no',
        options: [{ value: 'no', label: 'ไม่มี' }, { value: 'yes', label: 'มี' }] },
      { key: 'disabilityBenefitMonthly', label: 'ถ้ามี: ผลประโยชน์ต่อเดือน', type: 'money', showIf: (v) => v.hasDisabilityIncome === 'yes' },
      { key: 'existingRetirementSavings', label: 'เงินออมเพื่อเกษียณที่มีแล้วรวม (มูลค่าปัจจุบัน)', type: 'money' },
      { key: 'existingEducationSavings', label: 'เงินที่กันไว้เพื่อการศึกษาบุตรแล้ว', type: 'money' },
    ],
  },
  {
    id: 'benefits',
    title: '5. สวัสดิการ สิทธิรัฐ และเงินสะสม',
    hint: 'กรอกเท่าที่ทราบ — มีผลต่อความแม่นยำมาก',
    fields: [
      { key: 'stateHealth', label: 'สิทธิรักษาพยาบาลหลัก', type: 'select', default: 'sso', options: optList(STATE_HEALTH) },
      { key: 'groupLifeSum', label: 'ประกันกลุ่มจากที่ทำงาน: ทุนชีวิต', type: 'money' },
      { key: 'groupHealthRoom', label: 'ประกันกลุ่ม: ค่าห้อง/วัน', type: 'money' },
      { key: 'groupHealthAnnual', label: 'ประกันกลุ่ม: วงเงินเหมาจ่าย/ปี', type: 'money' },
      { key: 'groupHasCi', label: 'ประกันกลุ่มมีความคุ้มครองโรคร้ายแรง', type: 'checkbox' },
      { key: 'groupCiSum', label: 'ถ้ามี: ทุนโรคร้ายแรงกลุ่ม', type: 'money', showIf: (v) => v.groupHasCi },
      { key: 'pvdMonthlyContribution', label: 'เงินสะสมกองทุนสำรองเลี้ยงชีพ/กบข. ต่อเดือน (ลูกจ้าง + นายจ้าง)', type: 'money' },
      { key: 'ssoPensionMonthly', label: 'บำนาญชราภาพประกันสังคมโดยประมาณ (บาท/เดือน)', type: 'money' },
      { key: 'rmfSsfPvdAnnual', label: 'RMF + SSF + PVD ที่จ่ายรวมต่อปี (สำหรับเพดานภาษี 500,000)', type: 'money' },
    ],
  },
  {
    id: 'goals',
    title: '6. เป้าหมาย ภาษี และความเสี่ยง',
    fields: [
      { key: 'retireAge', label: 'อายุเกษียณที่ต้องการ', type: 'number', min: 45, max: 75, default: 60 },
      { key: 'desiredMonthlyRetireExpenseToday', label: 'ค่าใช้จ่ายต่อเดือนหลังเกษียณ (ค่าเงินวันนี้ · เว้นว่าง = 70% ของค่าใช้จ่ายปัจจุบัน)', type: 'money' },
      { key: 'hospitalTier', label: 'ระดับโรงพยาบาลที่ลูกค้าต้องการ', type: 'select', default: 'private_standard',
        options: Object.entries(HEALTH_TARGETS).map(([value, v]) => ({ value, label: v.label })) },
      { key: 'lifeHealthPremiumPaid', label: 'เบี้ยประกันชีวิต + สุขภาพตนเอง ที่จ่ายอยู่ต่อปี', type: 'money' },
      { key: 'pensionPremiumPaid', label: 'เบี้ยประกันบำนาญที่จ่ายอยู่ต่อปี', type: 'money' },
      { key: 'netTaxableIncomeOverride', label: 'เงินได้สุทธิต่อปี (จาก ภ.ง.ด. ปีที่แล้ว · ถ้ากรอกจะใช้ค่านี้คำนวณภาษี)', type: 'money' },
      { key: 'parentsInCare', label: 'จำนวนบิดา/มารดาที่อยู่ในอุปการะ (อายุ 60+) — สำหรับลดหย่อนภาษี', type: 'number', min: 0, max: 4 },
      { key: 'mortgageInterestPaid', label: 'ดอกเบี้ยกู้ซื้อบ้านที่จ่ายต่อปี — สำหรับลดหย่อนภาษี', type: 'money' },
      { key: 'riskTolerance', label: 'ระดับความเสี่ยงที่ลูกค้ารับได้ (ถ้าจะพิจารณายูนิตลิงก์)', type: 'select', default: 'unknown',
        options: [
          { value: 'unknown', label: 'ยังไม่ได้ประเมิน' },
          { value: 'low', label: 'ต่ำ — เน้นเงินต้นปลอดภัย' },
          { value: 'medium', label: 'ปานกลาง' },
          { value: 'high', label: 'สูง — รับความผันผวนได้' },
        ] },
    ],
  },
];

export const CHILD_PLAN_OPTIONS = optList(EDUCATION_PRESETS);
export const CHILD_SCHOOL_OPTIONS = optList(SCHOOL_PRESETS);

const numOr = (x, d = 0) => {
  if (x === '' || x == null) return d;
  const v = Number(String(x).replace(/[, ]/g, ''));
  return Number.isFinite(v) ? v : d;
};
const optNum = (x) => (x === '' || x == null ? undefined : numOr(x));

/** แปลงค่าดิบจากฟอร์ม → input ที่ engine ใช้ */
export function toNeedsInput(raw) {
  const r = raw || {};
  return {
    clientName: r.clientName || '',
    age: numOr(r.age, 30),
    sex: r.sex || 'M',
    maritalStatus: r.maritalStatus || 'single',
    occupation: r.occupation || '',
    businessOwner: !!r.businessOwner,
    smoker: !!r.smoker,
    children: (r.children || [])
      .filter((c) => c && c.age !== '' && c.age != null)
      .map((c) => ({ age: numOr(c.age), plan: c.plan || 'local_public', schoolType: c.schoolType || 'none' })),

    supportsSpouse: !!r.supportsSpouse,
    spouseHasIncome: !!r.spouseHasIncome,
    spouseIncomeShare: numOr(r.spouseIncomeShare) / 100,
    supportsParents: !!r.supportsParents,
    parentSupportMonthly: numOr(r.parentSupportMonthly),
    parentSupportYears: optNum(r.parentSupportYears),

    monthlyIncome: numOr(r.monthlyIncome),
    otherAnnualIncome: numOr(r.otherAnnualIncome),
    monthlyHouseholdExpense: numOr(r.monthlyHouseholdExpense),
    totalDebt: numOr(r.totalDebt),
    personalGuaranteeDebt: numOr(r.personalGuaranteeDebt),
    liquidAssets: numOr(r.liquidAssets),
    premiumBudgetMonthly: numOr(r.premiumBudgetMonthly),

    existingLifeSum: numOr(r.existingLifeSum),
    existingHealthRoom: numOr(r.existingHealthRoom),
    existingHealthAnnual: numOr(r.existingHealthAnnual),
    existingHealthCopay: !!r.existingHealthCopay,
    existingCiSum: numOr(r.existingCiSum),
    existingPaSum: numOr(r.existingPaSum),
    hasDisabilityIncome: r.hasDisabilityIncome === 'yes',
    disabilityBenefitMonthly: numOr(r.disabilityBenefitMonthly),
    existingRetirementSavings: numOr(r.existingRetirementSavings),
    existingEducationSavings: numOr(r.existingEducationSavings),

    stateHealth: r.stateHealth || 'sso',
    groupLifeSum: numOr(r.groupLifeSum),
    groupHealthRoom: numOr(r.groupHealthRoom),
    groupHealthAnnual: numOr(r.groupHealthAnnual),
    groupHasCi: !!r.groupHasCi,
    groupCiSum: numOr(r.groupCiSum),
    pvdMonthlyContribution: numOr(r.pvdMonthlyContribution),
    ssoPensionMonthly: numOr(r.ssoPensionMonthly),
    rmfSsfPvdAnnual: numOr(r.rmfSsfPvdAnnual),

    retireAge: numOr(r.retireAge, 60),
    desiredMonthlyRetireExpenseToday: optNum(r.desiredMonthlyRetireExpenseToday),
    hospitalTier: r.hospitalTier || 'private_standard',
    lifeHealthPremiumPaid: numOr(r.lifeHealthPremiumPaid),
    pensionPremiumPaid: numOr(r.pensionPremiumPaid),
    netTaxableIncomeOverride: optNum(r.netTaxableIncomeOverride),
    parentsInCare: numOr(r.parentsInCare),
    parentHealthPremiumPaid: numOr(r.parentHealthPremiumPaid),
    mortgageInterestPaid: numOr(r.mortgageInterestPaid),
    socialSecurityPaid: numOr(r.socialSecurityPaid),
    riskTolerance: r.riskTolerance || 'unknown',

    overrides: r.overrides || undefined,
  };
}
