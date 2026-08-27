/** ฟังก์ชันการเงินพื้นฐาน (pure) */

/** มูลค่าอนาคตของเงินก้อนเดียว */
export function futureValue(present, ratePerPeriod, periods) {
  return present * Math.pow(1 + ratePerPeriod, periods);
}

/** ตัวคูณมูลค่าอนาคตของการออมงวดละเท่า ๆ กัน (ปลายงวด) */
export function fvAnnuityFactor(ratePerPeriod, periods) {
  if (periods <= 0) return 0;
  if (ratePerPeriod === 0) return periods;
  return (Math.pow(1 + ratePerPeriod, periods) - 1) / ratePerPeriod;
}

/** ตัวคูณมูลค่าปัจจุบันของการถอนงวดละเท่า ๆ กัน (ปลายงวด) */
export function pvAnnuityFactor(ratePerPeriod, periods) {
  if (periods <= 0) return 0;
  if (ratePerPeriod === 0) return periods;
  return (1 - Math.pow(1 + ratePerPeriod, -periods)) / ratePerPeriod;
}

/** อัตราผลตอบแทนที่แท้จริง (หักเงินเฟ้อ) */
export function realRate(nominalRate, inflation) {
  return (1 + nominalRate) / (1 + inflation) - 1;
}

/**
 * เงินออมต่อเดือนที่ต้องเก็บ เพื่อให้ได้เงินก้อนเป้าหมายในอนาคต
 * คืน null ถ้าไม่มีเวลาเหลือ (ให้ผู้เรียกจัดการเอง)
 */
export function monthlySavingForTarget(targetFV, annualRate, years) {
  const months = Math.round(years * 12);
  if (months <= 0) return null;
  const factor = fvAnnuityFactor(annualRate / 12, months);
  if (factor === 0) return null;
  return targetFV / factor;
}

/**
 * เงินก้อนตั้งต้นจะถอนใช้ (ปรับด้วยเงินเฟ้อ) ได้นานกี่ปี
 * คืน Infinity ถ้าถอนน้อยกว่าผลตอบแทน (ไม่มีวันหมด)
 */
export function yearsPotLasts(pot, annualWithdrawalToday, realAnnualRate) {
  if (annualWithdrawalToday <= 0) return Infinity;
  if (realAnnualRate === 0) return pot / annualWithdrawalToday;
  const ratio = (pot * realAnnualRate) / annualWithdrawalToday;
  if (ratio >= 1) return Infinity; // ดอกผลมากกว่าเงินที่ถอน
  return Math.log(1 / (1 - ratio)) / Math.log(1 + realAnnualRate);
}

export const clampMin = (x, min = 0) => (x < min ? min : x);
