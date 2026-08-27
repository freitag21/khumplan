import { LIFE } from './assumptions.js';

const n = (x) => (Number.isFinite(x) ? x : Number.isFinite(+x) && x !== '' && x != null ? +x : 0);
const clamp01 = (x) => Math.max(0, Math.min(1, x));

/**
 * ปิรามิดการเงิน (Financial Planning Pyramid)
 * ชั้นล่างต้องมั่นคงก่อนขึ้นชั้นบน — เป็นกรอบเล่าเรื่องว่าทำไมต้องปิดด้านสีแดงก่อน
 *
 * @param {ReturnType<import('./needs.js').analyze>} result
 */
export function buildPyramid(result) {
  const { categories, input } = result;
  const byKey = Object.fromEntries(categories.map((c) => [c.key, c]));

  const emTarget = n(input.monthlyHouseholdExpense) * LIFE.emergencyFundMonths;
  const emHave = n(input.liquidAssets);
  const emCoverage = emTarget > 0 ? clamp01(emHave / emTarget) : 1;

  const item = (label, cov, status) => ({ label, coverage: clamp01(cov), status: status || covStatus(cov) });

  const tiers = [
    {
      key: 'protection',
      title: 'ป้องกันความเสี่ยง',
      subtitle: 'รากฐาน — ต้องมั่นคงก่อน',
      // อุบัติเหตุ/ทุพพลภาพเป็น "ส่วนเสริม" — ไม่นับในค่าเฉลี่ยชั้นรากฐาน (สอดคล้องกับช่องว่างรวม)
      items: [
        item(`เงินสำรองฉุกเฉิน (${LIFE.emergencyFundMonths} เดือน)`, emCoverage),
        item('ประกันสุขภาพ', byKey.health.coverage, byKey.health.status),
        item(byKey.life.label, byKey.life.coverage, byKey.life.status),
        item('ประกันโรคร้ายแรง', byKey.ci.coverage, byKey.ci.status),
      ],
    },
    {
      key: 'savings',
      title: 'สร้างความมั่นคง',
      subtitle: 'เป้าหมายที่รู้ล่วงหน้า',
      items: [
        item('เงินเพื่อการเกษียณ', byKey.retirement.coverage, byKey.retirement.status),
        ...((input.children || []).length
          ? [item('ทุนการศึกษาบุตร', byKey.education.coverage, byKey.education.status)]
          : []),
      ],
    },
    {
      key: 'wealth',
      title: 'สร้างความมั่งคั่ง',
      subtitle: 'ต่อยอด — เมื่อ 2 ชั้นล่างมั่นคง',
      informational: true,
      items: [
        { label: 'ลงทุนเพื่อผลตอบแทนระยะยาว (กองทุน / ยูนิตลิงก์ส่วนลงทุน)', coverage: 0, status: 'info' },
        { label: 'วางแผนมรดกและภาษีขั้นสูง', coverage: 0, status: 'info' },
      ],
    },
  ];

  for (const t of tiers) {
    if (t.informational) { t.coverage = null; t.status = 'info'; continue; }
    const avg = t.items.reduce((s, i) => s + i.coverage, 0) / t.items.length;
    t.coverage = avg;
    t.status = avg >= 0.8 ? 'solid' : avg >= 0.4 ? 'building' : 'weak';
  }

  // ชั้นที่ควรเสริมก่อน = ชั้นแรกที่ยังไม่ solid (ข้ามชั้น informational)
  const idx = tiers.findIndex((t) => !t.informational && t.status !== 'solid');
  const currentTier = idx === -1 ? tiers.length - 1 : idx;
  const baseSecure = tiers[0].status === 'solid';
  const midSecure = tiers[1].status === 'solid';

  return {
    tiers,
    currentTier,
    headline: !baseSecure
      ? 'เสริมชั้นรากฐานให้แน่นก่อน — สุขภาพ ชีวิต โรคร้ายแรง และเงินสำรองฉุกเฉิน'
      : !midSecure
        ? 'รากฐานมั่นคงแล้ว — ต่อที่ชั้นสร้างความมั่นคง (เกษียณ / การศึกษาบุตร)'
        : 'สองชั้นล่างมั่นคง พร้อมพิจารณาการลงทุนต่อยอดความมั่งคั่ง',
  };
}

function covStatus(cov) {
  if (cov >= 0.8) return 'ok';
  if (cov > 0) return 'gap';
  return 'none';
}
