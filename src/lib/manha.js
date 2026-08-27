/**
 * MANHA — สูตรคัดกรองผู้มุ่งหวัง (prospect) ก่อนลงเวลานัดเต็ม
 * M Money · A Authority · N Need · H Health · A Age
 *
 * ไม่ใช่การตัดสินคน และไม่ใช่ go/no-go — เป็นตัวช่วยจัดลำดับว่าใครควรคุยก่อน
 * และ "ขั้นถัดไปคืออะไร" สำหรับผู้มุ่งหวังแต่ละแบบ
 * (Need = "ยังไม่เห็นความจำเป็น" ไม่ใช่เหตุผลให้ทิ้ง — นั่นคือนิยามของงานตัวแทน)
 */

const OK = 'ok', WATCH = 'watch', STOP = 'stop', UNKNOWN = 'unknown';

export const MANHA_FIELDS = [
  {
    key: 'money', letter: 'M', label: 'กำลังจ่ายเบี้ย (Money)',
    options: [
      { value: 'comfortable', label: 'จ่ายได้สบาย' },
      { value: 'ok', label: 'พอจ่ายได้' },
      { value: 'tight', label: 'ค่อนข้างตึงมือ' },
      { value: 'none', label: 'ยังไม่พร้อมจ่าย' },
    ],
  },
  {
    key: 'budget', letter: '฿', label: 'งบเบี้ยที่รับได้ต่อเดือน (บาท) — ถ้าทราบ', type: 'number', placeholder: 'บาท/เดือน',
  },
  {
    key: 'authority', letter: 'A', label: 'อำนาจตัดสินใจ (Authority)',
    options: [
      { value: 'self', label: 'ตัดสินใจเองได้' },
      { value: 'joint', label: 'ตัดสินใจร่วมกับคู่สมรส' },
      { value: 'spouse', label: 'ต้องปรึกษาคู่สมรสก่อน' },
      { value: 'other', label: 'คนอื่นเป็นผู้ตัดสินใจ' },
      { value: 'minor', label: 'ผู้เยาว์ — ผู้ปกครองตัดสินใจ' },
    ],
  },
  {
    key: 'need', letter: 'N', label: 'ความจำเป็น (Need)',
    options: [
      { value: 'clear', label: 'ชัดเจน — มีคนพึ่งพา / หนี้ / เป้าหมายเงิน' },
      { value: 'some', label: 'พอมีอยู่บ้าง' },
      { value: 'none', label: 'ยังไม่เห็นความจำเป็น' },
    ],
  },
  {
    key: 'health', letter: 'H', label: 'สุขภาพ (Health)',
    options: [
      { value: 'healthy', label: 'แข็งแรงดี' },
      { value: 'controlled', label: 'มีโรคประจำตัวที่คุมได้' },
      { value: 'treating', label: 'อยู่ระหว่างรักษา / รอผลตรวจ' },
      { value: 'declined', label: 'เคยถูกปฏิเสธ / เลื่อนการรับประกัน' },
    ],
  },
  {
    key: 'age', letter: 'A', label: 'อายุ (Age)', type: 'number', placeholder: 'ปี',
  },
];

/** บล็อกที่ 2 — การเข้าถึง (พยากรณ์อัตราปิดได้ดีกว่า MANHA เอง) */
export const LEAD_FIELDS = [
  {
    key: 'source', letter: '', label: 'ที่มาของรายชื่อ',
    options: [
      { value: 'referral', label: 'มีคนแนะนำต่อ' },
      { value: 'warm', label: 'คนรู้จัก / ลูกค้าเดิม' },
      { value: 'cold', label: 'คนแปลกหน้า' },
    ],
  },
  {
    key: 'competition', letter: '', label: 'มีตัวแทนประจำอยู่แล้ว?',
    options: [
      { value: 'none', label: 'ไม่มี / ไม่แน่ใจ' },
      { value: 'agent', label: 'มีตัวแทนที่ติดต่ออยู่' },
      { value: 'family', label: 'ญาติสายตรงเป็นตัวแทน' },
    ],
  },
  {
    key: 'referralPotential', letter: '', label: 'โอกาสแนะนำต่อ',
    options: [
      { value: 'high', label: 'สูง — อยู่ในวงคนที่เข้าถึงได้อีกหลายคน' },
      { value: 'normal', label: 'ปกติ' },
    ],
  },
];

function scoreMoney(v) {
  if (v === 'none') return [WATCH, 'ยังไม่มีกำลังจ่ายก้อนใหญ่ — เริ่มด้วยความคุ้มครองจำเป็นที่เบี้ยหลักพัน (สุขภาพ/PA) และเก็บไว้ใน nurture list'];
  if (v === 'tight') return [WATCH, 'งบจำกัด — เริ่มจากความเสี่ยงใหญ่สุดที่เบี้ยพอดีตัว อย่าเสนอเกินกำลัง (persistency เริ่มที่ตรงนี้)'];
  return [OK, ''];
}
function scoreAuthority(v) {
  if (v === 'other') return [WATCH, 'ผู้ที่คุยไม่ใช่ผู้ตัดสินใจ — หาทางนัดให้เจอผู้ตัดสินใจตัวจริง ห้ามนำเสนอครั้งเดียวจบ'];
  if (v === 'spouse') return [WATCH, 'ชวนคู่สมรสเข้าร่วมนัดตั้งแต่ต้น จะปิดได้เร็วกว่าคุยทีละคน'];
  if (v === 'minor') return [WATCH, 'ผู้เยาว์ตามกฎหมาย (อายุต่ำกว่า 20) — ผู้ปกครองเป็นผู้ถือกรมธรรม์และตัดสินใจ'];
  return [OK, ''];
}
function scoreNeed(v) {
  if (v === 'none') return [WATCH, 'ยังไม่เห็นความจำเป็น — นัดแรกห้ามเสนอแบบ ให้ถามอย่างเดียวจนเขาเห็นช่องว่างของตัวเอง (ลูกค้าส่วนใหญ่เริ่มจากตรงนี้)'];
  if (v === 'some') return [WATCH, 'ความจำเป็นยังไม่ชัด — ใช้หน้า Protection Gap ช่วยให้เห็นภาพก่อนเสนอ'];
  return [OK, ''];
}
function scoreHealth(v) {
  if (v === 'declined') return [STOP, 'เคยถูกปฏิเสธ/เลื่อนการรับประกัน — เสนอทางเลือกที่รับได้: PA, แบบไม่ถามสุขภาพ, ประกันกลุ่ม ก่อนพิจารณาแบบมาตรฐาน'];
  if (v === 'treating') return [STOP, 'อยู่ระหว่างรักษา/รอผลตรวจ — รอให้จบก่อนจึงยื่นขอทำประกัน จะไม่เสียเวลาทั้งสองฝ่าย'];
  if (v === 'controlled') return [WATCH, 'โรคประจำตัวที่คุมได้มักรับประกันได้ แต่เบี้ย/เงื่อนไขอาจต่างจากมาตรฐาน — สอบถามประวัติก่อนเสนอ'];
  return [OK, ''];
}
function scoreAge(v) {
  const age = Number(v);
  if (!Number.isFinite(age) || age <= 0) return [UNKNOWN, ''];
  if (age > 75) return [WATCH, 'อายุใกล้/เกินเพดานของแบบส่วนใหญ่ — โฟกัสแบบเฉพาะผู้สูงอายุ หรือวางแผนผ่านคนในครอบครัว'];
  if (age >= 61) return [WATCH, 'ใกล้เพดานอายุรับประกัน — ตัวเลือกแบบและทุนจำกัด ยิ่งเริ่มเร็วยิ่งดี'];
  if (age < 20) return [WATCH, 'ผู้เยาว์ตามกฎหมายไทย — ผู้ปกครองเป็นผู้ถือกรมธรรม์ วางแผนร่วมกับพ่อแม่'];
  return [OK, ''];
}

const SCORERS = { money: scoreMoney, authority: scoreAuthority, need: scoreNeed, health: scoreHealth, age: scoreAge };

/**
 * @param {object} input
 */
export function screenManha(input = {}) {
  const dims = MANHA_FIELDS.filter((f) => SCORERS[f.key]).map((f) => {
    const [status, note] = SCORERS[f.key](input[f.key]);
    return { key: f.key, letter: f.letter, label: f.label, value: input[f.key] ?? null, status, note };
  });

  const complete = dims.every((d) => d.status !== UNKNOWN) && ['money', 'authority', 'need', 'health'].every((k) => input[k]);
  const stops = dims.filter((d) => d.status === STOP);
  const watches = dims.filter((d) => d.status === WATCH);

  // "ขั้นถัดไป" ตามจุดที่เด่นที่สุด (ไม่ใช่ go/no-go)
  let nextStep, headline, tone;
  if (!complete) {
    nextStep = 'กรอกให้ครบก่อนประเมิน'; headline = 'ยังกรอกไม่ครบ'; tone = 'neutral';
  } else if (stops.some((d) => d.key === 'health')) {
    headline = 'ตรวจความเป็นไปได้ก่อน';
    nextStep = 'สอบถามประวัติสุขภาพ/ปรึกษาฝ่ายพิจารณารับประกัน หรือเสนอแบบที่ไม่ถามสุขภาพก่อน';
    tone = 'stop';
  } else if (dims.find((d) => d.key === 'age')?.status === WATCH && Number(input.age) > 75) {
    headline = 'เปลี่ยนเป้าเป็นคนในครอบครัว';
    nextStep = 'เสนอผ่านลูก/หลาน + แบบเฉพาะผู้สูงอายุ';
    tone = 'watch';
  } else if (dims.find((d) => d.key === 'need')?.status === WATCH) {
    headline = 'นัดเพื่อค้นหาความต้องการ';
    nextStep = 'นัดแรกฟังอย่างเดียว ห้ามเสนอแบบ ให้เขาเห็นช่องว่างของตัวเองก่อน';
    tone = 'watch';
  } else if (dims.find((d) => d.key === 'money')?.status === WATCH) {
    headline = 'เริ่มด้วยแผนเล็ก + เก็บไว้ติดตาม';
    nextStep = 'เสนอความคุ้มครองจำเป็นที่เบี้ยหลักพัน + ขอ referral ไปคนรอบตัว + ตั้งเตือนติดตาม';
    tone = 'watch';
  } else if (['spouse', 'other'].includes(input.authority)) {
    headline = 'นัดใหม่ให้ครบผู้ตัดสินใจ';
    nextStep = 'จัดนัดที่มีผู้ตัดสินใจอยู่ด้วยตั้งแต่ต้น';
    tone = 'watch';
  } else if (watches.length >= 2) {
    headline = 'คุยต่อได้ — เตรียมตัวตามจุดที่ต้องระวัง';
    nextStep = 'ทำ Protection Gap ก่อนเข้านัด และเตรียมรับมือแต่ละจุดด้านล่าง';
    tone = 'watch';
  } else {
    headline = 'ผู้มุ่งหวังคุณภาพ — นัดนำเสนอได้';
    nextStep = 'จัดคนนี้ไว้ต้นคิว ทำ Protection Gap เพื่อเข้านัดแบบมีข้อมูล';
    tone = 'go';
  }

  // priority ในคิว จากบล็อกการเข้าถึง
  let queue = 'ปกติ';
  const reasons = [];
  if (input.source === 'referral') { queue = 'ดันขึ้นต้นคิว'; reasons.push('มีคนแนะนำ — อัตราปิดสูงกว่า cold หลายเท่า'); }
  if (input.referralPotential === 'high') { queue = 'ดันขึ้นต้นคิว'; reasons.push('อยู่ในวงคนที่แนะนำต่อได้อีกหลายคน'); }
  if (input.competition === 'family') { queue = 'ปรับความคาดหวังลง'; reasons.push('ญาติสายตรงเป็นตัวแทน — โอกาสปิดต่ำ ใช้เวลาน้อยลง'); }
  else if (input.competition === 'agent') reasons.push('มีตัวแทนติดต่ออยู่ — เตรียมจุดต่างของเรา');

  return {
    input, dimensions: dims, complete,
    counts: { stops: stops.length, watches: watches.length },
    headline, nextStep, tone,
    queue, queueReasons: reasons,
    budget: Number(input.budget) || null,
  };
}
