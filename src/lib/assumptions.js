/**
 * สมมติฐานกลางสำหรับการวิเคราะห์ Protection Gap
 * ------------------------------------------------
 * เป็น "ค่าตั้งต้น" เชิงประมาณการตามหลักการวางแผนการเงินทั่วไป
 * (Needs Approach / DIME / Human Life Value) ไม่ใช่ตัวเลขผลประโยชน์ของบริษัทประกันใด ๆ
 * และไม่ใช่คำแนะนำการลงทุน — ใช้เพื่อชี้ให้เห็น "ช่องว่าง" ของความคุ้มครองเท่านั้น
 *
 * ปรับค่าที่นี่ที่เดียว · ตัวแทนปรับรายเคสได้ผ่านแผง "ปรับสมมติฐาน" บนฟอร์ม
 * ค่าที่ทบทวนกับ Win (ตัวแทน/นักวางแผน) รอบ 2026-08 แล้ว
 */

export const ASSUMPTIONS_VERSION = '2026-08-28';
export const TAX_YEAR = 2568;

export const RATES = {
  inflation: 0.03, // เงินเฟ้อทั่วไปต่อปี (planning number)
  medicalInflation: 0.09, // เงินเฟ้อค่ารักษาพยาบาลต่อปี — medical trend ไทยจริง 8–14%
  educationInflation: 0.05, // เงินเฟ้อค่าการศึกษาต่อปี
  preRetireReturnLong: 0.05, // ผลตอบแทนก่อนเกษียณ เมื่อเหลือเวลา > 15 ปี
  preRetireReturnShort: 0.04, // ผลตอบแทนก่อนเกษียณ เมื่อเหลือเวลา ≤ 15 ปี
  postRetireReturn: 0.03, // ผลตอบแทนหลังเกษียณต่อปี
};

/** วางแผน "เผื่ออายุยืน" ไม่ใช่ค่ามัธยฐาน — ครึ่งหนึ่งของคนอยู่นานกว่าอายุขัยเฉลี่ย */
export const LIFE_EXPECTANCY = { M: 85, F: 90 };

export const LIFE = {
  finalExpenses: 300000, // งานศพ + ค่าใช้จ่ายช่วงสุดท้าย + ค่าจัดการมรดก
  consumptionFactor: 0.7, // สัดส่วนรายได้ที่ใช้ดูแลครอบครัว (หักส่วนที่ผู้เอาประกันใช้เอง ~30%)
  defaultYearsToSupport: 15,
  capMultipleOfAnnualIncome: 15, // เพดานทุนชีวิต = 15 เท่าของรายได้ต่อปี + หนี้ (กันตัวเลขวิ่ง)
  emergencyFundMonths: 6, // กันเงินสำรองฉุกเฉินของครอบครัวก่อนหักสภาพคล่อง
};

export const CI = {
  recoveryMonths: 30, // ทดแทนค่าใช้จ่ายครัวเรือนช่วงพักฟื้น (เดือน)
  minimum: 1000000,
  /** ส่วนค่ารักษาที่ประกันสุขภาพไม่ครอบคลุม — ตามวงเงินเหมาจ่ายที่มีอยู่ */
  treatmentTopUp: {
    high: 500000, // เหมาจ่าย ≥ 5 ลบ.
    mid: 1000000, // เหมาจ่าย 1–5 ลบ.
    low: 2000000, // ไม่มี / น้อยกว่า 1 ลบ.
  },
};

export const ACCIDENT = {
  paIncomeMultiple: 5, // ทุน PA = 5 เท่าของรายได้ต่อปี
  disabilityIncomeReplacement: 0.6, // ชดเชยรายได้ทุพพลภาพ = 60% ของรายได้
  // PA ไม่นับซ้ำในช่องว่างรวม — แสดงเป็น "ส่วนเสริมเบี้ยถูก" (คนตายจากอุบัติเหตุก็ตายเหมือนกัน)
};

/** เป้าค่าห้อง/วัน และวงเงินเหมาจ่าย/ปี ตามระดับโรงพยาบาลที่ลูกค้าต้องการ (ตลาดหลัง New Health Standard) */
export const HEALTH_TARGETS = {
  government: { label: 'โรงพยาบาลรัฐ (ห้องพิเศษ)', roomPerDay: 2000, annualLimit: 1000000 },
  private_standard: { label: 'เอกชนทั่วไป', roomPerDay: 6000, annualLimit: 5000000 },
  private_premium: { label: 'เอกชนพรีเมียม', roomPerDay: 12000, annualLimit: 25000000 },
};

/** สิทธิรักษาพยาบาลจากรัฐ/นายจ้าง — ลดสัดส่วนความจำเป็นด้านสุขภาพ */
export const STATE_HEALTH = {
  none: { label: 'ไม่มี / ซื้อเอง', coverageRatio: 0 },
  sso: { label: 'ประกันสังคม', coverageRatio: 0.35 },
  universal: { label: 'บัตรทอง (30 บาท)', coverageRatio: 0.3 },
  civil_servant: { label: 'ข้าราชการ / รัฐวิสาหกิจ', coverageRatio: 0.85 },
};

/** งบทุนการศึกษาระดับมหาวิทยาลัยต่อบุตร 1 คน (มูลค่าปัจจุบัน ถึงจบปริญญาตรี) */
export const EDUCATION_PRESETS = {
  local_public: { label: 'มหาวิทยาลัยรัฐในประเทศ', amountToday: 800000 },
  local_private: { label: 'มหาวิทยาลัยเอกชน / หลักสูตรอินเตอร์', amountToday: 2500000 },
  overseas_asia_eu: { label: 'เรียนต่อ UK / ออสเตรเลีย / เอเชีย', amountToday: 5000000 },
  overseas_us: { label: 'เรียนต่อสหรัฐฯ', amountToday: 10000000 },
};
export const EDUCATION_TARGET_AGE = 18;

/** ค่าเทอมโรงเรียน K‑12 ต่อปี (มูลค่าปัจจุบัน) — คิดเป็นกระแสจ่ายรายปีจนบุตรอายุ 18 */
export const SCHOOL_PRESETS = {
  none: { label: 'โรงเรียนรัฐ / ไม่ต้องเตรียมค่าเทอม', annualToday: 0 },
  bilingual: { label: 'สองภาษา (EP/MEP)', annualToday: 200000 },
  international: { label: 'นานาชาติ', annualToday: 600000 },
};

export const RETIREMENT = {
  defaultRetireAge: 60,
  expenseReplacementRatio: 0.7, // ค่าใช้จ่ายหลังเกษียณ = 70% ของค่าใช้จ่ายปัจจุบัน
};

/** ขั้นบันไดภาษีเงินได้บุคคลธรรมดา (ปีภาษี 2567 เป็นต้นมา) */
export const TAX_BRACKETS = [
  { upTo: 150000, rate: 0 },
  { upTo: 300000, rate: 0.05 },
  { upTo: 500000, rate: 0.1 },
  { upTo: 750000, rate: 0.15 },
  { upTo: 1000000, rate: 0.2 },
  { upTo: 2000000, rate: 0.25 },
  { upTo: 5000000, rate: 0.3 },
  { upTo: Infinity, rate: 0.35 },
];

export const TAX_DEDUCTION = {
  personalAllowance: 60000,
  spouseAllowance: 60000, // คู่สมรสไม่มีเงินได้
  childAllowance: 30000, // ต่อคน (ค่ากลาง — บุตรคนที่ 2 ที่เกิดปี 2561+ ได้ 60,000)
  parentAllowancePerHead: 30000, // บิดา/มารดาอายุ 60+ ที่อยู่ในอุปการะ
  parentHealthMax: 15000,
  socialSecurityMax: 9000,
  mortgageInterestMax: 100000,
  expenseDeductionMax: 100000, // หักค่าใช้จ่ายเงินเดือน 50% สูงสุด 100,000
  lifeAndHealthCombinedMax: 100000, // เบี้ยประกันชีวิต + สุขภาพตนเอง รวมกันไม่เกิน 100,000
  healthSubLimit: 25000, // ส่วนสุขภาพตนเอง ไม่เกิน 25,000 (อยู่ในเพดาน 100,000)
  pensionRateOfIncome: 0.15, // ประกันบำนาญ ไม่เกิน 15% ของเงินได้
  pensionMax: 200000, // และไม่เกิน 200,000
  retirementCombinedMax: 500000, // รวมบำนาญ + RMF/SSF/PVD/กบข./กอช. ไม่เกิน 500,000
};

/** น้ำหนักของแต่ละหมวดในคะแนนความพร้อม (เฉพาะหมวดที่ใช้กับลูกค้ารายนั้น) */
export const CATEGORY_WEIGHTS = {
  health: 25,
  life: 25,
  ci: 20,
  retirement: 15,
  education: 10,
  accident: 5,
};

/** ระดับคะแนนความพร้อม (เลี่ยงคำว่า "สอบตก" — คนไทยรับต่อหน้าลูกค้าไม่ได้) */
export const SCORE_LEVELS = [
  { min: 80, label: 'ครบถ้วน' },
  { min: 60, label: 'ค่อนข้างครบ' },
  { min: 40, label: 'กำลังสร้าง' },
  { min: 0, label: 'เริ่มต้น' },
];
