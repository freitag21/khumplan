import { TAX_BRACKETS, TAX_DEDUCTION, TAX_YEAR } from './assumptions.js';
import { clampMin } from './finance.js';

const n = (x) => (Number.isFinite(x) ? x : Number.isFinite(+x) && x !== '' && x != null ? +x : 0);

/** ภาษีเงินได้บุคคลธรรมดาจากเงินได้สุทธิ (ขั้นบันได) */
export function taxOn(taxableIncome) {
  let tax = 0;
  let lower = 0;
  for (const b of TAX_BRACKETS) {
    if (taxableIncome <= lower) break;
    const slice = Math.min(taxableIncome, b.upTo) - lower;
    tax += slice * b.rate;
    lower = b.upTo;
  }
  return tax;
}

/** อัตราภาษีขั้นสูงสุด (marginal rate) ที่เงินได้สุทธิก้อนบนสุดตกอยู่ */
export function marginalRate(taxableIncome) {
  let rate = 0;
  let lower = 0;
  for (const b of TAX_BRACKETS) {
    if (taxableIncome > lower) rate = b.rate;
    if (taxableIncome <= b.upTo) break;
    lower = b.upTo;
  }
  return rate;
}

/**
 * ประมาณเงินได้สุทธิ "ก่อน" การซื้อประกันเพิ่ม
 * ใช้ค่าที่ตัวแทนกรอก ถ้ามี netTaxableIncomeOverride ให้ใช้ตรง ๆ
 */
function estimateTaxableIncome(input) {
  if (Number.isFinite(+input.netTaxableIncomeOverride) && +input.netTaxableIncomeOverride > 0) {
    return +input.netTaxableIncomeOverride;
  }
  const annualIncome = n(input.monthlyIncome) * 12 + n(input.otherAnnualIncome);
  const D = TAX_DEDUCTION;

  let deductions = D.personalAllowance;
  deductions += Math.min(annualIncome * 0.5, D.expenseDeductionMax);
  if (input.maritalStatus === 'married' && !input.spouseHasIncome) deductions += D.spouseAllowance;
  deductions += (input.children || []).length * D.childAllowance;
  deductions += Math.min(n(input.parentsInCare), 4) * D.parentAllowancePerHead;
  deductions += Math.min(n(input.parentHealthPremiumPaid), D.parentHealthMax);
  const sso = n(input.socialSecurityPaid) || (input.stateHealth === 'sso' ? D.socialSecurityMax : 0);
  deductions += Math.min(sso, D.socialSecurityMax);
  deductions += Math.min(n(input.mortgageInterestPaid), D.mortgageInterestMax);
  // ประกัน/RMF/SSF/PVD ที่จ่ายอยู่แล้ว (ก่อนซื้อเพิ่ม)
  deductions += Math.min(n(input.lifeHealthPremiumPaid), D.lifeAndHealthCombinedMax);
  deductions += Math.min(n(input.rmfSsfPvdAnnual) + n(input.pensionPremiumPaid), D.retirementCombinedMax);

  return clampMin(annualIncome - deductions);
}

/**
 * วิเคราะห์สิทธิลดหย่อนภาษีที่ "ยังเหลือ" จากการทำประกันเพิ่ม
 * คำนวณแบบ ภาษีก่อน − ภาษีหลัง (ไม่ใช่ headroom × marginal rate) เพราะการลดหย่อนก้อนใหญ่ข้ามขั้นบันได
 */
export function analyzeTax(input) {
  const D = TAX_DEDUCTION;
  const annualIncome = n(input.monthlyIncome) * 12 + n(input.otherAnnualIncome);
  const lifeHealthPaid = n(input.lifeHealthPremiumPaid);
  const pensionPaid = n(input.pensionPremiumPaid);
  const otherRetirement = n(input.rmfSsfPvdAnnual); // PVD + RMF + SSF ที่จ่ายอยู่

  const taxableBefore = estimateTaxableIncome(input);
  const rate = marginalRate(taxableBefore);

  // สิทธิที่เหลือ
  const lifeHealthHeadroom = clampMin(D.lifeAndHealthCombinedMax - lifeHealthPaid);
  const healthOnlyHeadroom = clampMin(D.healthSubLimit - Math.min(lifeHealthPaid, D.healthSubLimit));
  const pensionCapByIncome = Math.min(D.pensionMax, annualIncome * D.pensionRateOfIncome);
  const retirementUsed = pensionPaid + otherRetirement;
  const pensionHeadroom = clampMin(Math.min(pensionCapByIncome - pensionPaid, D.retirementCombinedMax - retirementUsed));

  const totalHeadroom = lifeHealthHeadroom + pensionHeadroom;
  const taxableAfter = clampMin(taxableBefore - totalHeadroom);
  const potentialTaxSaving = clampMin(taxOn(taxableBefore) - taxOn(taxableAfter));

  return {
    taxYear: TAX_YEAR,
    estimatedTaxableIncome: Math.round(taxableBefore),
    marginalRate: rate,
    taxBefore: Math.round(taxOn(taxableBefore)),
    lifeHealthPaid,
    lifeHealthHeadroom,
    healthOnlyHeadroom,
    pensionPaid,
    pensionCap: Math.round(pensionCapByIncome),
    pensionHeadroom,
    retirementCombinedRemaining: clampMin(D.retirementCombinedMax - retirementUsed),
    totalHeadroom,
    potentialTaxSaving: Math.round(potentialTaxSaving),
    usedDirectEntry: Number.isFinite(+input.netTaxableIncomeOverride) && +input.netTaxableIncomeOverride > 0,
    notes: [
      `ประมาณจากเกณฑ์ปีภาษี ${TAX_YEAR}` +
        (Number.isFinite(+input.netTaxableIncomeOverride) && +input.netTaxableIncomeOverride > 0
          ? ' (ใช้เงินได้สุทธิที่กรอกโดยตรง)'
          : ' — ควรตรวจสอบค่าลดหย่อนทั้งหมดกับผู้ทำบัญชี'),
      'เบี้ยประกันชีวิต + สุขภาพตนเอง รวมกันไม่เกิน 100,000 บาท (ส่วนสุขภาพตนเองไม่เกิน 25,000 บาท)',
      'ประกันบำนาญไม่เกิน 15% ของเงินได้ และไม่เกิน 200,000 บาท เมื่อรวมกับ RMF/SSF/PVD/กบข./กอช. แล้วไม่เกิน 500,000 บาท',
      'ตัวเลขภาษีที่ประหยัดคำนวณแบบภาษีก่อน−หลัง เป็นการประมาณการเบื้องต้น สิทธิจริงขึ้นกับรายการลดหย่อนทั้งหมดของท่าน',
    ],
  };
}
