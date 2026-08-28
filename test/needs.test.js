import { describe, it, expect } from 'vitest';
import { analyze, analyzeLife, analyzeRetirement, analyzeHealth, analyzeDisability } from '../src/lib/needs.js';
import { marginalRate, taxOn, analyzeTax } from '../src/lib/tax.js';
import { recommend } from '../src/lib/recommend.js';
import { screenManha } from '../src/lib/manha.js';
import { buildPyramid } from '../src/lib/pyramid.js';

const base = {
  clientName: 'ทดสอบ', age: 35, sex: 'M', maritalStatus: 'married', occupation: 'พนักงานบริษัทเอกชน',
  children: [{ age: 5, plan: 'local_private', schoolType: 'none' }],
  supportsSpouse: true, spouseHasIncome: true, spouseIncomeShare: 0.4,
  monthlyIncome: 60000, otherAnnualIncome: 120000, monthlyHouseholdExpense: 40000,
  totalDebt: 2000000, liquidAssets: 500000,
  existingLifeSum: 1000000, existingHealthRoom: 0, existingHealthAnnual: 0,
  existingCiSum: 0, existingPaSum: 500000, hasDisabilityIncome: false,
  existingRetirementSavings: 800000, existingEducationSavings: 200000,
  stateHealth: 'sso', groupLifeSum: 0, groupHealthAnnual: 0, pvdMonthlyContribution: 0,
  retireAge: 60, hospitalTier: 'private_standard', lifeHealthPremiumPaid: 30000, pensionPremiumPaid: 0,
  riskTolerance: 'unknown',
};

describe('analyzeLife', () => {
  it('มีผู้พึ่งพา → ทุนที่ควรมี > ทุนที่มี', () => {
    const r = analyzeLife(base);
    expect(r.need).toBeGreaterThan(r.have);
    expect(r.detail.dependents).toBe(true);
    expect(r.detail.incomeReplacement).toBeGreaterThan(0);
  });

  it('ไม่มีผู้พึ่งพา → ทดแทนรายได้ = 0, label เป็น "คุ้มครองหนี้สิน"', () => {
    const r = analyzeLife({ ...base, maritalStatus: 'single', children: [], supportsSpouse: false, supportsParents: false });
    expect(r.detail.incomeReplacement).toBe(0);
    expect(r.label).toContain('หนี้สิน');
    // ควรใกล้เคียงหนี้ + ค่าใช้จ่ายช่วงสุดท้าย เท่านั้น (ไม่ใช่หลายสิบล้าน)
    expect(r.need).toBeLessThan(2000000 + 500000 + 1);
  });

  it('เพดานทุน 15 เท่าของรายได้ต่อปี ทำงาน', () => {
    const r = analyzeLife({ ...base, spouseIncomeShare: 0, children: [{ age: 1 }, { age: 2 }] });
    const annualIncome = 60000 * 12 + 120000;
    expect(r.need).toBeLessThanOrEqual(annualIncome * 15 + 2000000 + 300000 + 1);
  });

  it('การ์ดกระทบกัน: มีอยู่ + ช่องว่าง = ควรมี', () => {
    const r = analyzeLife({ ...base, liquidAssets: 900000 });
    expect(r.have + r.gap).toBe(r.need);
  });
});

describe('analyzeHealth', () => {
  it('ข้าราชการ → คะแนน coverage สูง สถานะ ok หรือ gap เล็ก', () => {
    const r = analyzeHealth({ ...base, stateHealth: 'civil_servant' });
    expect(r.coverage).toBeGreaterThan(0.7);
  });
  it('ไม่มีสิทธิ + ไม่มีประกัน → status none', () => {
    const r = analyzeHealth({ ...base, stateHealth: 'none' });
    expect(r.status).toBe('none');
  });
});

describe('analyzeRetirement', () => {
  it('โหมดสะสม: มี monthlySavingNeeded เมื่อมีช่องว่าง', () => {
    const r = analyzeRetirement(base);
    expect(r.detail.mode).toBe('accumulation');
    if (r.gap > 0) expect(r.detail.monthlySavingNeeded).toBeGreaterThan(0);
  });
  it('เงินสะสม PVD ต่อเนื่องช่วยลดช่องว่าง', () => {
    const a = analyzeRetirement(base);
    const b = analyzeRetirement({ ...base, pvdMonthlyContribution: 10000 });
    expect(b.gap).toBeLessThan(a.gap);
  });
  it('เกษียณแล้ว → โหมด decumulation ไม่มี NaN/ตัวเลขบ้า', () => {
    const r = analyzeRetirement({ ...base, age: 65, retireAge: 60, existingRetirementSavings: 5000000 });
    expect(r.detail.mode).toBe('decumulation');
    expect(r.detail.monthlySavingNeeded).toBeUndefined();
    expect(Number.isFinite(r.severity)).toBe(true);
  });
});

describe('tax', () => {
  it('taxOn คำนวณขั้นบันไดถูก', () => {
    expect(taxOn(150000)).toBe(0);
    expect(taxOn(300000)).toBeCloseTo(7500, 0); // 150k @ 5%
    expect(taxOn(500000)).toBeCloseTo(7500 + 20000, 0);
  });
  it('marginalRate ตามขั้น', () => {
    expect(marginalRate(120000)).toBe(0);
    expect(marginalRate(400000)).toBe(0.1);
  });
  it('ค่าลดหย่อนคู่สมรส/บุตร/ดอกเบี้ยบ้าน ดันเงินได้สุทธิลง → อัตราภาษีต่ำลง', () => {
    const bare = analyzeTax({ monthlyIncome: 70000, maritalStatus: 'single', children: [] });
    const full = analyzeTax({ monthlyIncome: 70000, maritalStatus: 'married', spouseHasIncome: false, children: [{ age: 5 }, { age: 8 }], mortgageInterestPaid: 100000, socialSecurityPaid: 9000 });
    expect(full.estimatedTaxableIncome).toBeLessThan(bare.estimatedTaxableIncome);
    expect(full.marginalRate).toBeLessThanOrEqual(bare.marginalRate);
  });
  it('netTaxableIncomeOverride ถูกใช้ตรง ๆ', () => {
    const t = analyzeTax({ monthlyIncome: 100000, netTaxableIncomeOverride: 400000, lifeHealthPremiumPaid: 0, pensionPremiumPaid: 0 });
    expect(t.estimatedTaxableIncome).toBe(400000);
    expect(t.usedDirectEntry).toBe(true);
  });
  it('บังคับเพดานรวมกลุ่มเกษียณ 500,000', () => {
    const t = analyzeTax({ monthlyIncome: 200000, rmfSsfPvdAnnual: 450000, pensionPremiumPaid: 0 });
    expect(t.pensionHeadroom).toBeLessThanOrEqual(50000);
  });
});

describe('analyze (รวม)', () => {
  it('คืน categories + summary แยกช่องว่าง 2 ก้อน', () => {
    const r = analyze(base);
    expect(r.categories).toHaveLength(6);
    expect(r.summary.protectionGap).toBeGreaterThanOrEqual(0);
    expect(r.summary.savingsGap).toBeGreaterThanOrEqual(0);
    expect(r.summary.overallScore).toBeGreaterThanOrEqual(0);
    expect(r.summary.overallScore).toBeLessThanOrEqual(100);
    expect(typeof r.summary.overallLevel).toBe('string');
    expect(Array.isArray(r.summary.strengths)).toBe(true);
  });

  it('ทุพพลภาพเป็นหมวดเต็ม (6 หมวด, เข้า priorityOrder ได้) · PA เป็นบรรทัดเสริม', () => {
    const r = analyze(base);
    expect(r.categories).toHaveLength(6);
    expect(r.categories.map((c) => c.key)).toEqual(['life', 'health', 'ci', 'disability', 'retirement', 'education']);
    expect(r.categories.find((c) => c.key === 'accident')).toBeUndefined();
    const dis = r.categories.find((c) => c.key === 'disability');
    expect(dis.excludeFromTotal).toBeFalsy();
    expect(dis.detail.pa.have).toBe(500000); // existingPaSum ยังถูกอ่านเป็นบรรทัดเสริม
    // มีช่องว่างทุพพลภาพ (have=0) → อยู่ใน priorityOrder
    expect(r.summary.priorityOrder).toContain('disability');
  });

  it('ทุพพลภาพ: เกษียณแล้ว/ไม่มีรายได้ → ยังมี need (ค่าดูแล) ไม่พัง', () => {
    const r = analyzeDisability({ ...base, age: 65, retireAge: 60, monthlyIncome: 0, totalDebt: 0 });
    expect(r.need).toBeGreaterThanOrEqual(1000000); // อย่างน้อย DISABILITY.minimum
    expect(Number.isFinite(r.need)).toBe(true);
    expect(Number.isFinite(r.gap)).toBe(true);
  });

  it('ทุพพลภาพ: มีแต่ประกันกลุ่ม (TPD กลุ่มก้อนใหญ่) → บังคับเป็นช่องว่าง ไม่ "ok" ปลอม', () => {
    const r = analyzeDisability({ ...base, groupTpdSum: 99000000, existingTpdSum: 0, disabilityBenefitMonthly: 0 });
    expect(r.status).toBe('gap');
    expect(r.detail.groupOnly).toBe(true);
  });

  it('ทุพพลภาพ: WP อย่างเดียว ไม่นับเป็นทุน (have ไม่ขยับ) + มี note', () => {
    const withWp = analyzeDisability({ ...base, hasWaiverOfPremium: true, existingTpdSum: 0, disabilityBenefitMonthly: 0 });
    const without = analyzeDisability({ ...base, hasWaiverOfPremium: false, existingTpdSum: 0, disabilityBenefitMonthly: 0 });
    expect(withWp.have).toBe(without.have);
    expect(withWp.notes.some((t) => t.includes('ยกเว้นการชำระเบี้ย'))).toBe(true);
  });

  it('ทุพพลภาพ: ทุน TPD ก้อนใหญ่ → ปิดช่องว่างได้ (status ok)', () => {
    const r = analyzeDisability({ ...base, existingTpdSum: 99000000, totalDebt: 0 });
    expect(r.gap).toBe(0);
    expect(r.status).toBe('ok');
  });

  it('ทุพพลภาพ: หัก ปกส. (sso) ทำให้ส่วนทดแทนรายได้ต่ำกว่าไม่มีสิทธิรัฐ', () => {
    const withSso = analyzeDisability({ ...base, stateHealth: 'sso' });
    const noState = analyzeDisability({ ...base, stateHealth: 'none' });
    expect(withSso.detail.incomeNeed).toBeLessThan(noState.detail.incomeNeed);
  });

  it('summary.gapDetail: มีทุกหมวดใน priorityOrder และ have + gap = need', () => {
    const r = analyze(base);
    expect(Array.isArray(r.summary.gapDetail)).toBe(true);
    expect(r.summary.gapDetail.map((d) => d.key)).toEqual(r.summary.priorityOrder);
    for (const d of r.summary.gapDetail) {
      expect(Math.abs(d.have + d.gap - d.need)).toBeLessThanOrEqual(1); // เผื่อปัดเศษ
    }
  });

  it('ไม่มีบุตร → หมวดการศึกษา applicable=false และไม่ถ่วงคะแนน', () => {
    const r = analyze({ ...base, children: [] });
    const edu = r.categories.find((c) => c.key === 'education');
    expect(edu.applicable).toBe(false);
  });

  it('recommend: ยูนิตลิงก์เสนอเฉพาะเมื่อ riskTolerance รับได้', () => {
    const lowRisk = recommend(analyze({ ...base, monthlyIncome: 80000, riskTolerance: 'low' }));
    const highRisk = recommend(analyze({ ...base, monthlyIncome: 80000, riskTolerance: 'high' }));
    expect(lowRisk.some((x) => x.type === 'unit_linked')).toBe(false);
    expect(highRisk.some((x) => x.type === 'unit_linked')).toBe(true);
  });
});

describe('screenManha', () => {
  it('ฟอร์มเปล่า → complete=false, tone=neutral', () => {
    const r = screenManha({});
    expect(r.complete).toBe(false);
    expect(r.tone).toBe('neutral');
  });
  it('ครบทุกด้าน + ปกติ → tone go', () => {
    const r = screenManha({ money: 'ok', authority: 'self', need: 'clear', health: 'healthy', age: 35 });
    expect(r.complete).toBe(true);
    expect(r.tone).toBe('go');
  });
  it('Need = ยังไม่เห็นความจำเป็น → ไม่ใช่ stop แต่เป็น "นัดเพื่อค้นหาความต้องการ"', () => {
    const r = screenManha({ money: 'ok', authority: 'self', need: 'none', health: 'healthy', age: 35 });
    expect(r.tone).toBe('watch');
    expect(r.headline).toContain('ค้นหาความต้องการ');
  });
  it('สุขภาพอยู่ระหว่างรักษา → stop', () => {
    const r = screenManha({ money: 'ok', authority: 'self', need: 'clear', health: 'treating', age: 40 });
    expect(r.tone).toBe('stop');
    expect(r.dimensions.find((d) => d.key === 'health').status).toBe('stop');
  });
  it('อายุ 72 → watch ไม่ใช่ stop', () => {
    const r = screenManha({ money: 'ok', authority: 'self', need: 'clear', health: 'healthy', age: 72 });
    expect(r.dimensions.find((d) => d.key === 'age').status).toBe('watch');
  });
  it('มีคนแนะนำ → ดันขึ้นต้นคิว', () => {
    const r = screenManha({ money: 'ok', authority: 'self', need: 'clear', health: 'healthy', age: 35, source: 'referral' });
    expect(r.queue).toBe('ดันขึ้นต้นคิว');
  });
});

describe('buildPyramid', () => {
  it('คืน 3 ชั้น + currentTier ชี้ชั้นที่ยังไม่ solid', () => {
    const p = buildPyramid(analyze(base));
    expect(p.tiers).toHaveLength(3);
    expect(p.tiers[2].informational).toBe(true);
    expect(p.currentTier).toBeGreaterThanOrEqual(0);
    expect(p.tiers[p.currentTier].status).not.toBe('solid');
  });
  it('ลูกค้าคุ้มครองครบ → ชั้นรากฐาน solid, headline พูดถึงชั้นบน', () => {
    const rich = analyze({
      ...base, existingHealthRoom: 8000, existingHealthAnnual: 30000000, existingCiSum: 5000000,
      existingLifeSum: 30000000, existingPaSum: 10000000, liquidAssets: 3000000,
      hasDisabilityIncome: true, disabilityBenefitMonthly: 40000,
    });
    const p = buildPyramid(rich);
    expect(p.tiers[0].status).toBe('solid');
  });
  it('ไม่มีบุตร → ชั้นสร้างความมั่นคงไม่มีรายการทุนการศึกษา', () => {
    const p = buildPyramid(analyze({ ...base, children: [] }));
    expect(p.tiers[1].items.some((i) => i.label.includes('การศึกษา'))).toBe(false);
  });
});
