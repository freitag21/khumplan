import {
  RATES,
  LIFE_EXPECTANCY,
  LIFE,
  CI,
  ACCIDENT,
  HEALTH_TARGETS,
  STATE_HEALTH,
  EDUCATION_PRESETS,
  SCHOOL_PRESETS,
  EDUCATION_TARGET_AGE,
  RETIREMENT,
  CATEGORY_WEIGHTS,
  SCORE_LEVELS,
  ASSUMPTIONS_VERSION,
} from './assumptions.js';
import {
  futureValue,
  fvAnnuityFactor,
  pvAnnuityFactor,
  realRate,
  monthlySavingForTarget,
  yearsPotLasts,
  clampMin,
} from './finance.js';
import { analyzeTax } from './tax.js';

const n = (x) => (Number.isFinite(x) ? x : Number.isFinite(+x) && x !== '' && x != null ? +x : 0);
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const pct = (r) => +(r * 100).toFixed(1);
const bn = (x) => Math.round(x).toLocaleString('th-TH');

/** override รายเคสจากแผง "ปรับสมมติฐาน" */
function ov(input, key, def) {
  const v = input.overrides && input.overrides[key];
  return Number.isFinite(v) ? v : def;
}

function annualIncomeOf(input) {
  return n(input.monthlyIncome) * 12 + n(input.otherAnnualIncome);
}

/** ผลตอบแทนก่อนเกษียณ — สูงขึ้นถ้ายังมีเวลาสะสมนาน */
function preRate(input) {
  const years = clampMin((n(input.retireAge) || RETIREMENT.defaultRetireAge) - n(input.age));
  const base = years > 15 ? RATES.preRetireReturnLong : RATES.preRetireReturnShort;
  return ov(input, 'preRetireReturn', base);
}

function hasDependents(input) {
  return Boolean(input.supportsSpouse) || (input.children || []).length > 0 || Boolean(input.supportsParents);
}

/** ปีที่ครอบครัวต้องพึ่งพารายได้ */
function dependentYears(input) {
  if (Number.isFinite(ov(input, 'yearsToSupport', NaN))) return ov(input, 'yearsToSupport', 0);
  const kids = (input.children || []).filter((c) => Number.isFinite(+c.age));
  const spans = [];
  if (kids.length) spans.push(clampMin(25 - Math.min(...kids.map((c) => +c.age)), 3));
  if (input.supportsSpouse) {
    const retireAge = n(input.retireAge) || RETIREMENT.defaultRetireAge;
    spans.push(clampMin(retireAge - n(input.age), 10));
  }
  if (input.supportsParents && Number.isFinite(+input.parentSupportYears)) spans.push(+input.parentSupportYears);
  return spans.length ? Math.max(...spans) : LIFE.defaultYearsToSupport;
}

function severityFromGap(gap, need) {
  if (need <= 0) return gap > 0 ? 100 : 0;
  return Math.round(clamp01(gap / need) * 100);
}
const covFromSeverity = (sev) => clamp01(1 - sev / 100);

function statusOf(have, gap) {
  if (have <= 0 && gap > 0) return 'none';
  if (gap > 0) return 'gap';
  return 'ok';
}

/* ═══════════════════ แต่ละหมวด ═══════════════════ */

export function analyzeLife(input) {
  const annualIncome = annualIncomeOf(input);
  const dep = hasDependents(input);
  const years = dependentYears(input);
  const consumF = ov(input, 'consumptionFactor', LIFE.consumptionFactor);
  const rReal = realRate(preRate(input), RATES.inflation);

  let incomeReplacement = 0;
  if (dep && years > 0) {
    const spouseOffset = clamp01(n(input.spouseIncomeShare));
    const annualFamilyNeed = annualIncome * consumF * (1 - spouseOffset);
    incomeReplacement = annualFamilyNeed * pvAnnuityFactor(rReal, years);
  }
  if (input.supportsParents && n(input.parentSupportMonthly) > 0) {
    const py = n(input.parentSupportYears) || years || 10;
    incomeReplacement += n(input.parentSupportMonthly) * 12 * pvAnnuityFactor(rReal, py);
  }

  const debt = n(input.totalDebt) + (input.businessOwner ? n(input.personalGuaranteeDebt) : 0);
  const finalExp = ov(input, 'finalExpenses', LIFE.finalExpenses);

  let need = incomeReplacement + debt + finalExp;
  const cap = annualIncome * LIFE.capMultipleOfAnnualIncome + debt + finalExp;
  const capped = need > cap;
  if (capped) need = cap;

  const personalLife = n(input.existingLifeSum);
  const groupLife = n(input.groupLifeSum);
  const emergencyFund = n(input.monthlyHouseholdExpense) * LIFE.emergencyFundMonths;
  const usableLiquid = clampMin(n(input.liquidAssets) - emergencyFund);

  const available = personalLife + groupLife + usableLiquid;
  const gap = clampMin(need - available);
  const gapIfLeaveJob = clampMin(need - personalLife - usableLiquid);

  const notes = [];
  if (!dep) notes.push('ยังไม่มีผู้อยู่ในอุปการะ — ทุนที่ควรมีครอบคลุมเฉพาะหนี้สินและค่าใช้จ่ายช่วงสุดท้าย');
  else notes.push(`ทดแทนรายได้ที่ครอบครัวต้องพึ่งพา ${pct(consumF)}% เป็นเวลา ${years} ปี (คิดลดด้วยผลตอบแทนที่แท้จริง) + หนี้สิน + ค่าใช้จ่ายช่วงสุดท้าย`);
  notes.push(`"มีอยู่" = ทุนประกันชีวิต ${bn(personalLife + groupLife)}` + (usableLiquid > 0 ? ` + สินทรัพย์สภาพคล่องที่นำมาชำระได้ ${bn(usableLiquid)} (หลังกันเงินสำรองฉุกเฉิน ${LIFE.emergencyFundMonths} เดือน)` : ''));
  if (groupLife > 0) notes.push(`รวมทุนกลุ่มจากที่ทำงาน ${bn(groupLife)} บาท ซึ่ง "คุ้มครองเฉพาะระหว่างเป็นพนักงาน" — ถ้าออกจากงานวันนี้ ช่องว่างจะเป็น ${bn(gapIfLeaveJob)} บาท`);
  if (capped) notes.push(`จำกัดทุนไว้ที่ ${LIFE.capMultipleOfAnnualIncome} เท่าของรายได้ต่อปี + หนี้`);

  return {
    key: 'life',
    label: dep ? 'ประกันชีวิต / คุ้มครองรายได้' : 'ประกันชีวิต / คุ้มครองหนี้สิน',
    have: Math.round(available), // ทุนประกัน + สภาพคล่องที่ใช้ได้ → have + gap = need
    need: Math.round(need),
    gap: Math.round(gap),
    severity: severityFromGap(gap, need),
    coverage: covFromSeverity(severityFromGap(gap, need)),
    status: statusOf(personalLife + groupLife, gap),
    detail: {
      dependents: dep,
      yearsToSupport: years,
      incomeReplacement: Math.round(incomeReplacement),
      debt,
      finalExpenses: finalExp,
      usableLiquid: Math.round(usableLiquid),
      groupLife,
      gapIfLeaveJob: Math.round(gapIfLeaveJob),
    },
    notes,
  };
}

export function analyzeHealth(input) {
  const target = HEALTH_TARGETS[input.hospitalTier] || HEALTH_TARGETS.private_standard;
  const state = STATE_HEALTH[input.stateHealth] || STATE_HEALTH.none;

  const room = Math.max(n(input.existingHealthRoom), n(input.groupHealthRoom));
  let annual = Math.max(n(input.existingHealthAnnual), n(input.groupHealthAnnual));
  if (input.existingHealthCopay && annual > 0) annual *= 0.7; // ประมาณผลของ copay/deductible

  // สิทธิรัฐช่วยค่ารักษา (วงเงินเหมาจ่าย) ได้เต็มสัดส่วน แต่ให้ห้องรวม/ห้องพื้นฐาน → หักส่วนลดห้องเพียงครึ่งเดียว
  const targetRoom = target.roomPerDay * (1 - state.coverageRatio * 0.5);
  const targetAnnual = target.annualLimit * (1 - state.coverageRatio);
  const roomGap = clampMin(targetRoom - room);
  const annualGap = clampMin(targetAnnual - annual);

  const privateCover = room > 0 || annual > 0;
  const roomCov = targetRoom > 0 ? clamp01(room / targetRoom) : 1;
  const annualCov = targetAnnual > 0 ? clamp01(annual / targetAnnual) : 1;
  let coverage = state.coverageRatio + (1 - state.coverageRatio) * (0.4 * roomCov + 0.6 * annualCov);
  coverage = clamp01(coverage);
  const severity = Math.round((1 - coverage) * 100);

  let status;
  if (!privateCover && state.coverageRatio < 0.5) status = 'none';
  else if (roomGap > 0 || annualGap > 0) status = 'gap';
  else status = 'ok';

  const notes = [
    `เทียบระดับ "${target.label}" — เป้าหมายเต็ม ค่าห้อง ${bn(target.roomPerDay)} บาท/วัน · วงเงินเหมาจ่าย ${bn(target.annualLimit)} บาท/ปี`,
  ];
  if (state.coverageRatio > 0) notes.push(`หักสิทธิ ${state.label} แล้ว เหลือส่วนที่ควรมีประกันเอง ~${bn(Math.round(targetRoom))} บาท/วัน และ ~${bn(Math.round(targetAnnual))} บาท/ปี (ตัวเลข "ควรมี" ด้านบนคือหลังหักสิทธิแล้ว)`);
  if (input.existingHealthCopay) notes.push('ปรับลดวงเงินที่มีอยู่เพราะแผนเดิมมีความรับผิดส่วนแรก (copay/deductible)');
  notes.push(`ค่ารักษาพยาบาลเฟ้อเฉลี่ย ~${pct(ov(input, 'medicalInflation', RATES.medicalInflation))}% ต่อปี — ความคุ้มครองที่พอวันนี้อาจไม่พอในอนาคต`);

  return {
    key: 'health',
    label: 'ประกันสุขภาพ',
    have: room,
    need: Math.round(targetRoom),
    gap: Math.round(roomGap),
    severity,
    coverage,
    status,
    detail: {
      targetLabel: target.label,
      currentRoom: room,
      targetRoom: Math.round(targetRoom),
      roomGap: Math.round(roomGap),
      currentAnnualLimit: Math.round(annual),
      targetAnnualLimit: Math.round(targetAnnual),
      annualGap: Math.round(annualGap),
      stateLabel: state.coverageRatio > 0 ? state.label : null,
    },
    notes,
  };
}

export function analyzeCriticalIllness(input) {
  const recoveryNeed = n(input.monthlyHouseholdExpense) * CI.recoveryMonths;
  const annualLimit = Math.max(n(input.existingHealthAnnual), n(input.groupHealthAnnual));
  const tier = annualLimit >= 5_000_000 ? 'high' : annualLimit >= 1_000_000 ? 'mid' : 'low';
  const topUp = CI.treatmentTopUp[tier];
  const need = Math.max(ov(input, 'ciMinimum', CI.minimum), recoveryNeed + topUp);

  const have = n(input.existingCiSum) + (input.groupHasCi ? n(input.groupCiSum) : 0);
  const gap = clampMin(need - have);

  return {
    key: 'ci',
    label: 'ประกันโรคร้ายแรง',
    have,
    need: Math.round(need),
    gap: Math.round(gap),
    severity: severityFromGap(gap, need),
    coverage: covFromSeverity(severityFromGap(gap, need)),
    status: statusOf(have, gap),
    detail: {
      recoveryMonths: CI.recoveryMonths,
      recoveryNeed: Math.round(recoveryNeed),
      treatmentTopUp: topUp,
      tier,
    },
    notes: [
      `ทดแทนค่าใช้จ่ายครัวเรือนช่วงพักฟื้น ${CI.recoveryMonths} เดือน (${bn(recoveryNeed)} บาท) + ส่วนค่ารักษาที่ประกันสุขภาพไม่ครอบคลุม (${bn(topUp)} บาท ตามวงเงินเหมาจ่ายที่มี)`,
      'ค่ารักษามะเร็งด้วยยามุ่งเป้า/ภูมิคุ้มกันบำบัดครบคอร์สอาจแตะ 2–4 ล้านบาท และไม่แปรผันตามรายได้',
    ],
  };
}

export function analyzeAccident(input) {
  const annualIncome = annualIncomeOf(input);
  const need = annualIncome * ACCIDENT.paIncomeMultiple;
  const have = n(input.existingPaSum);
  const gap = clampMin(need - have);

  const disabilityTarget = n(input.monthlyIncome) * ACCIDENT.disabilityIncomeReplacement;
  const disabilityBenefit = input.hasDisabilityIncome ? n(input.disabilityBenefitMonthly) : 0;
  const disabilityGap = clampMin(disabilityTarget - disabilityBenefit);

  return {
    key: 'accident',
    label: 'อุบัติเหตุ / ทุพพลภาพ',
    have,
    need: Math.round(need),
    gap: Math.round(gap),
    severity: severityFromGap(gap, need),
    coverage: covFromSeverity(severityFromGap(gap, need)),
    status: statusOf(have, gap),
    excludeFromTotal: true, // เป็นส่วนเสริม ไม่นับซ้ำกับทุนชีวิต
    detail: {
      disabilityTargetMonthly: Math.round(disabilityTarget),
      disabilityBenefitMonthly: Math.round(disabilityBenefit),
      disabilityGapMonthly: Math.round(disabilityGap),
    },
    notes: [
      `ทุน PA แนะนำ ${ACCIDENT.paIncomeMultiple} เท่าของรายได้ต่อปี เบี้ยถูกเมื่อเทียบกับทุน — เป็นส่วนเสริม ไม่ใช่ทุนคุ้มครองอีกก้อน (จึงไม่รวมในช่องว่างรวม)`,
      input.hasDisabilityIncome
        ? `ชดเชยรายได้ทุพพลภาพเป้าหมาย ${bn(disabilityTarget)} บาท/เดือน`
        : 'ยังไม่มีความคุ้มครองกรณีทุพพลภาพสิ้นเชิงถาวร (จ่ายก้อน / ยกเว้นเบี้ย)',
    ],
  };
}

export function analyzeRetirement(input) {
  const age = n(input.age);
  const retireAge = n(input.retireAge) || RETIREMENT.defaultRetireAge;
  const sex = input.sex === 'F' ? 'F' : 'M';
  const lifeExp = ov(input, 'lifeExpectancy', LIFE_EXPECTANCY[sex]);
  const yearsToRetire = clampMin(retireAge - age);
  const yearsInRetirement = clampMin(lifeExp - retireAge, 1);

  const inflation = ov(input, 'inflation', RATES.inflation);
  const pre = preRate(input);
  const post = ov(input, 'postRetireReturn', RATES.postRetireReturn);

  const desiredToday =
    ov(input, 'desiredMonthlyRetireExpense', NaN) ||
    n(input.desiredMonthlyRetireExpenseToday) ||
    n(input.monthlyHouseholdExpense) * RETIREMENT.expenseReplacementRatio;

  const ssoToday = n(input.ssoPensionMonthly);
  const netMonthlyToday = clampMin(desiredToday - ssoToday);

  // ── โหมดหลังเกษียณแล้ว: เงินที่มีพอใช้ถึงอายุเท่าไร ──
  if (yearsToRetire <= 0) {
    const pot = n(input.existingRetirementSavings);
    const lasts = yearsPotLasts(pot, netMonthlyToday * 12, realRate(post, inflation));
    const enough = lasts === Infinity || retireAge + lasts >= lifeExp;
    return {
      key: 'retirement',
      label: 'เงินเพื่อการเกษียณ (เกษียณแล้ว)',
      have: Math.round(pot),
      need: null,
      gap: 0,
      severity: enough ? 0 : 70,
      coverage: enough ? 1 : 0.3,
      status: enough ? 'ok' : 'gap',
      detail: {
        mode: 'decumulation',
        potLastsYears: lasts === Infinity ? Infinity : Math.round(lasts * 10) / 10,
        runsOutAtAge: lasts === Infinity ? null : Math.round(retireAge + lasts),
        desiredMonthlyToday: Math.round(desiredToday),
        netMonthlyToday: Math.round(netMonthlyToday),
      },
      notes: [
        enough
          ? 'จากข้อมูลที่กรอก เงินที่มีน่าจะเพียงพอสำหรับค่าใช้จ่ายตลอดช่วงเกษียณ'
          : `เงินที่มีจะใช้ได้ราว ${Math.round(lasts)} ปี (หมดราวอายุ ${Math.round(retireAge + lasts)}) — ควรทบทวนแผนการถอนใช้และค่าใช้จ่าย`,
      ],
    };
  }

  // ── โหมดสะสม ──
  const desiredAtRetire = futureValue(netMonthlyToday, inflation, yearsToRetire);
  const rRealPost = realRate(post, inflation);
  const annuityFactor = pvAnnuityFactor(rRealPost, yearsInRetirement);
  const corpusNeeded = desiredAtRetire * 12 * annuityFactor;

  const projectedLump = futureValue(n(input.existingRetirementSavings), pre, yearsToRetire);
  const monthlyContrib = n(input.pvdMonthlyContribution);
  const projectedContrib = monthlyContrib * fvAnnuityFactor(pre / 12, Math.round(yearsToRetire * 12));
  const projected = projectedLump + projectedContrib;

  const gap = clampMin(corpusNeeded - projected);
  const monthlySaving = gap > 0 ? monthlySavingForTarget(gap, pre, yearsToRetire) : 0;

  const notes = [
    `ต้องการใช้เดือนละ ${bn(desiredToday)} บาท (ค่าเงินวันนี้) หลังเกษียณอายุ ${retireAge} ถึงอายุ ${lifeExp}` +
      (ssoToday > 0 ? ` · หักบำนาญประกันสังคม ${bn(ssoToday)} บาท/เดือนแล้ว` : ''),
  ];
  if (monthlyContrib > 0) notes.push(`รวมเงินสะสมกองทุนสำรองเลี้ยงชีพ/กบข. ${bn(monthlyContrib)} บาท/เดือนที่จ่ายต่อเนื่อง`);
  notes.push(
    gap > 0
      ? `ต้องออมเพิ่มราวเดือนละ ${bn(monthlySaving || 0)} บาท (สมมติผลตอบแทน ${pct(pre)}%/ปี)`
      : 'เงินเพื่อเกษียณอยู่ในเป้าหมายตามข้อมูลที่กรอก'
  );

  return {
    key: 'retirement',
    label: 'เงินออมเพื่อเกษียณ',
    have: Math.round(projected),
    need: Math.round(corpusNeeded),
    gap: Math.round(gap),
    severity: severityFromGap(gap, corpusNeeded),
    coverage: covFromSeverity(severityFromGap(gap, corpusNeeded)),
    status: gap > 0 ? (projected <= 0 ? 'none' : 'gap') : 'ok',
    detail: {
      mode: 'accumulation',
      retireAge,
      lifeExpectancy: lifeExp,
      yearsToRetire,
      yearsInRetirement,
      desiredMonthlyToday: Math.round(desiredToday),
      desiredMonthlyAtRetire: Math.round(desiredAtRetire),
      projectedFromContributions: Math.round(projectedContrib),
      monthlySavingNeeded: Math.round(monthlySaving || 0),
    },
    notes,
  };
}

export function analyzeEducation(input) {
  const kids = (input.children || []).filter((c) => Number.isFinite(+c.age));
  if (!kids.length) {
    return {
      key: 'education', label: 'ทุนการศึกษาบุตร', have: 0, need: 0, gap: 0,
      severity: 0, coverage: 1, status: 'ok', applicable: false,
      detail: { perChild: [], monthlySavingNeeded: 0, annualSchoolFeeToday: 0 },
      notes: ['ยังไม่มีบุตร — ข้ามหมวดนี้ (พิจารณาเมื่อวางแผนมีบุตร)'],
    };
  }

  const eduInf = ov(input, 'educationInflation', RATES.educationInflation);
  const pre = preRate(input);

  const perChild = kids.map((c, i) => {
    const age = n(c.age);
    const yearsToUni = clampMin(EDUCATION_TARGET_AGE - age);
    const uni = EDUCATION_PRESETS[c.plan] || EDUCATION_PRESETS.local_public;
    const uniFuture = futureValue(uni.amountToday, eduInf, yearsToUni);
    const school = SCHOOL_PRESETS[c.schoolType] || SCHOOL_PRESETS.none;
    return {
      index: i + 1, age, planLabel: uni.label,
      schoolLabel: school.annualToday > 0 ? school.label : null,
      schoolAnnualToday: school.annualToday,
      yearsToUni,
      uniFuture: Math.round(uniFuture),
    };
  });

  const totalUniFuture = perChild.reduce((s, c) => s + c.uniFuture, 0);
  const soonest = Math.max(1, Math.min(...perChild.map((c) => c.yearsToUni)));
  const haveGrown = futureValue(n(input.existingEducationSavings), pre, soonest);
  const gap = clampMin(totalUniFuture - haveGrown);

  const monthlyPerChild = perChild.map((c) => {
    const share = totalUniFuture > 0 ? haveGrown * (c.uniFuture / totalUniFuture) : 0;
    const childGap = clampMin(c.uniFuture - share);
    return monthlySavingForTarget(childGap, pre, Math.max(1, c.yearsToUni)) || childGap / 12;
  });
  const monthlySavingNeeded = Math.round(monthlyPerChild.reduce((s, m) => s + m, 0));
  const annualSchoolFeeToday = perChild.reduce((s, c) => s + c.schoolAnnualToday, 0);

  const notes = [
    `ค่าเล่าเรียนมหาวิทยาลัยปรับด้วยเงินเฟ้อการศึกษา ${pct(eduInf)}%/ปี ถึงตอนบุตรอายุ ${EDUCATION_TARGET_AGE} · คำนวณเงินออม/เดือนแยกรายคนแล้วรวม`,
  ];
  if (annualSchoolFeeToday > 0)
    notes.push(`ค่าเทอมโรงเรียนอีกประมาณปีละ ${bn(annualSchoolFeeToday)} บาท (เตรียมจากกระแสเงินสดรายปี ไม่ใช่เงินก้อน — ไม่รวมในช่องว่างนี้)`);
  notes.push(gap > 0 ? `ต้องเก็บเพิ่มรวมราวเดือนละ ${bn(monthlySavingNeeded)} บาท` : 'ทุนการศึกษาอยู่ในเป้าหมาย');

  return {
    key: 'education',
    label: 'ทุนการศึกษาบุตร',
    have: Math.round(haveGrown),
    need: Math.round(totalUniFuture),
    gap: Math.round(gap),
    severity: severityFromGap(gap, totalUniFuture),
    coverage: covFromSeverity(severityFromGap(gap, totalUniFuture)),
    status: statusOf(n(input.existingEducationSavings), gap),
    applicable: true,
    detail: { perChild, monthlySavingNeeded, annualSchoolFeeToday: Math.round(annualSchoolFeeToday) },
    notes,
  };
}

/* ═══════════════════ รวม ═══════════════════ */

function collectStrengths(input, cats) {
  const s = [];
  if (n(input.groupLifeSum) > 0 || n(input.groupHealthAnnual) > 0) s.push('มีสวัสดิการประกันกลุ่มจากที่ทำงานเป็นฐานอยู่แล้ว');
  if ((STATE_HEALTH[input.stateHealth]?.coverageRatio || 0) >= 0.8) s.push('มีสิทธิรักษาพยาบาลจากรัฐที่ครอบคลุมสูง');
  if (n(input.pvdMonthlyContribution) > 0) s.push('มีกองทุนสำรองเลี้ยงชีพ/กบข. สะสมต่อเนื่องทุกเดือน');
  const ok = cats.filter((c) => c.status === 'ok' && c.applicable !== false);
  if (ok.length) s.push(`${ok.map((c) => c.label).join(' · ')} อยู่ในเกณฑ์เพียงพอแล้ว`);
  if (!s.length) s.push('เริ่มวางแผนตั้งแต่ตอนนี้ยังทันสำหรับทุกด้าน');
  return s;
}

/** @param {object} input */
export function analyze(input) {
  const categories = [
    analyzeLife(input),
    analyzeHealth(input),
    analyzeCriticalIllness(input),
    analyzeAccident(input),
    analyzeRetirement(input),
    analyzeEducation(input),
  ];
  const byKey = Object.fromEntries(categories.map((c) => [c.key, c]));

  const tax = analyzeTax(input);

  // ช่องว่างแยก 2 ก้อน — ไม่รวมค่าห้อง (บาท/วัน) และ PA (นับซ้ำ)
  const protectionGap = byKey.life.gap + byKey.ci.gap;
  const savingsGap = (byKey.retirement.gap || 0) + (byKey.education.gap || 0);
  const monthlySavingNeeded =
    (byKey.retirement.detail?.monthlySavingNeeded || 0) + (byKey.education.detail?.monthlySavingNeeded || 0);

  // เช็คความเป็นไปได้: เงินออมที่ต้องใช้เทียบกับกระแสเงินสดที่เหลือต่อเดือน
  const monthlySurplus = clampMin(n(input.monthlyIncome) - n(input.monthlyHouseholdExpense));
  const savingsOverSurplus = monthlySavingNeeded > monthlySurplus;

  // จัดลำดับความเร่งด่วน — ไม่รวมหมวด "ส่วนเสริม" (PA) เพราะไม่นับในช่องว่างรวมและไม่ควรเป็น "ก้าวแรก"
  const ranked = categories
    .filter((c) => c.status !== 'ok' && c.applicable !== false && !c.excludeFromTotal)
    .sort((a, b) => b.severity - a.severity);
  const priorityOrder = ranked.map((c) => c.key);
  // รายละเอียดช่องว่างต่อหมวด (สำหรับธง resale — เทียบ "มี" กับ "ควรมี")
  const gapDetail = ranked.map((c) => ({
    key: c.key,
    need: Math.round(c.need || 0),
    have: Math.round(c.have || 0),
    gap: Math.round(c.gap || 0),
  }));

  // "ก้าวแรก" = จัดการเฉพาะด้านที่เร่งที่สุด ไม่ใช่ทุกอย่างพร้อมกัน
  const top = ranked[0];
  const firstStep = top
    ? {
        key: top.key,
        label: top.label,
        monthly: top.detail?.monthlySavingNeeded || 0,
        lumpGap: top.gap || 0,
      }
    : null;

  // คะแนนความพร้อม = coverage ถ่วงน้ำหนัก เฉพาะหมวดที่ใช้กับลูกค้ารายนี้
  const applicable = categories.filter((c) => c.applicable !== false);
  const wSum = applicable.reduce((s, c) => s + (CATEGORY_WEIGHTS[c.key] || 0), 0);
  const overallScore = wSum
    ? Math.round((applicable.reduce((s, c) => s + (CATEGORY_WEIGHTS[c.key] || 0) * clamp01(c.coverage), 0) / wSum) * 100)
    : 0;
  const overallLevel = (SCORE_LEVELS.find((l) => overallScore >= l.min) || SCORE_LEVELS[SCORE_LEVELS.length - 1]).label;

  return {
    input,
    categories,
    tax,
    summary: {
      protectionGap,
      savingsGap,
      monthlySavingNeeded,
      monthlySurplus: Math.round(monthlySurplus),
      savingsOverSurplus,
      firstStep,
      totalGap: protectionGap + savingsGap, // เก็บไว้เผื่อ backward compat — อย่าโชว์เป็นตัวเด่น
      priorityOrder,
      gapDetail,
      overallScore,
      overallLevel,
      strengths: collectStrengths(input, categories),
    },
    meta: {
      generatedAt: new Date().toISOString(),
      assumptionsVersion: ASSUMPTIONS_VERSION,
      disclaimer:
        'ผลการวิเคราะห์นี้เป็นการประมาณการเพื่อประกอบการวางแผนความคุ้มครองเท่านั้น ' +
        'ไม่ใช่ตารางผลประโยชน์ของบริษัทประกัน ไม่ใช่การเสนอขายกรมธรรม์ ' +
        'และไม่ใช่คำแนะนำการลงทุนหรือการวางแผนภาษีเฉพาะบุคคล ' +
        'ผลตอบแทนที่ใช้คำนวณเป็นสมมติฐาน ไม่รับประกัน',
    },
  };
}

export { annualIncomeOf };
