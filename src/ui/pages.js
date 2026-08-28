import { h, s, icon, brand, BRAND, SUPPORT, CONTACT, EMAIL_ENABLED } from './dom.js';
import { ringGauge } from './charts.js';
import { POLICY_VERSION } from '../auth.js';

const BRAND_TH = BRAND === 'KhumPlan' ? 'คุ้มแพลน' : BRAND;

/* ---------------- Support the project ---------------- */

export function renderSupport({ onBack } = {}) {
  const chips = h('div', { class: 'support-nonpay' },
    h('span', {}, 'หรือช่วยแบบไม่ต้องจ่าย:'),
    h('span', { class: 'chip' }, 'บอกต่อเพื่อนตัวแทน'),
    h('span', { class: 'chip' }, 'ส่ง feedback ให้เราปรับปรุง'),
    h('span', { class: 'chip' }, 'ใช้แล้วรีวิวในกลุ่ม'));

  const channels = h('div', { class: 'support-channels' });
  if (SUPPORT.qrImage) {
    channels.append(h('figure', { class: 'support-qr' },
      h('img', { src: SUPPORT.qrImage, alt: 'QR สนับสนุนโปรเจค', width: 200, height: 200 }),
      SUPPORT.qrCaption ? h('figcaption', {}, SUPPORT.qrCaption) : null));
  }
  (SUPPORT.links || []).forEach((l) =>
    channels.append(h('a', { class: 'btn btn-primary', href: l.url, target: '_blank', rel: 'noopener' }, l.label, ' ↗')));
  if (!channels.children.length) {
    channels.append(h('div', { class: 'muted', style: 'font-size:13px' }, 'ช่องทางสนับสนุนกำลังจะเปิดเร็ว ๆ นี้'));
  }

  return h('div', { class: 'support-page' },
    h('div', { class: 'support-hero' },
      h('div', { class: 'support-cup' }, '☕'),
      h('h1', {}, `สนับสนุน${BRAND === 'KhumPlan' ? 'คุ้มแพลน' : BRAND}`),
      h('p', {}, `${BRAND === 'KhumPlan' ? 'คุ้มแพลน' : BRAND} ทำโดยตัวแทนคนเดียว เปิดให้ตัวแทนคนอื่นใช้ฟรี และตั้งใจให้ฟรีต่อไป`),
      h('p', {}, 'ค่าโดเมนและเซิร์ฟเวอร์จ่ายเอง — ถ้าเครื่องมือนี้ช่วยให้คุณคุยกับลูกค้าง่ายขึ้นหรือปิดงานได้เร็วขึ้น เลี้ยงกาแฟกันสักแก้วก็ดีใจมาก ไม่บังคับเลย')),
    h('div', { class: 'support-body' }, channels, chips,
      h('div', { style: 'margin-top:22px' },
        h('a', { href: '#', class: 'btn btn-ghost', onclick: (e) => { e.preventDefault(); onBack?.(); } }, '← กลับไปหน้าเครื่องมือ'))));
}

/* ---------------- วิธีใช้ ---------------- */

const GUIDE_STEPS = [
  ['คัดกรองผู้มุ่งหวังก่อน (ถ้ายังไม่แน่ใจ)',
    'เปิดเมนู "คัดกรอง MANHA" ตอบ 5 ข้อสั้น ๆ (เงิน · อำนาจตัดสินใจ · ความจำเป็น · สุขภาพ · อายุ) ระบบบอกว่าควรเดินหน้าต่อเลย หรือเก็บไว้ตามภายหลัง แล้วส่งข้อมูลที่กรอกไปหน้าแบบสอบถามให้อัตโนมัติ'],
  ['กรอกแบบสอบถาม 6 ขั้น จากบทสนทนากับลูกค้า',
    '(1) ข้อมูลลูกค้า+บุตร · (2) ผู้อยู่ในอุปการะ · (3) รายได้ ภาระ และงบเบี้ย · (4) ความคุ้มครองส่วนตัวที่มีอยู่ · (5) สวัสดิการ สิทธิรัฐ และเงินสะสม · (6) เป้าหมายเกษียณ ภาษี และความเสี่ยง — ใช้เวลาประมาณ 3 นาที กรอกเท่าที่รู้ก่อนได้ ช่องที่เว้นไว้ระบบจะใช้ค่ามาตรฐาน'],
  ['อ่านหน้าสรุป Protection Gap ไปพร้อมลูกค้า',
    'หน้าสรุปนำด้วย "ก้าวแรก" — ด้านที่ควรเริ่มก่อนและทุนที่ยังขาด ตามด้วยตาราง 6 ด้าน (มีอยู่ / ควรมี / ช่องว่าง) พีระมิดการเงิน จุดแข็งที่ลูกค้าทำไว้ดีแล้ว ประเภทประกันที่ควรพิจารณา และสิทธิลดหย่อนภาษีที่เหลือ'],
  ['พิมพ์ PDF หรือส่งลิงก์ให้ลูกค้า',
    'กด "พิมพ์ / บันทึก PDF" ได้รายงาน A4 หน้าเดียว มีชื่อและเลขใบอนุญาตของคุณบนหัวกระดาษ — หรือกด "บันทึกผลวิเคราะห์" เพื่อสร้างลิงก์อ่านอย่างเดียว (อายุ 90 วัน) ส่งให้ลูกค้าไปคุยต่อกับคู่สมรส'],
  ['บันทึกเข้าสมุดลูกค้า (ต้องเข้าสู่ระบบ)',
    'สมัครด้วยอีเมลและรหัสผ่าน ก่อนบันทึกต้องยืนยันว่าได้แจ้งวัตถุประสงค์และได้รับความยินยอมจากลูกค้าแล้ว (PDPA) — คุณเป็นผู้ควบคุมข้อมูล ระบบไม่แชร์ข้อมูลลูกค้าให้ตัวแทนคนอื่น'],
  ['กลับมาเปิด แก้ไข หรือลบ ในแดชบอร์ด',
    'แดชบอร์ดรวมผลวิเคราะห์ลูกค้าทุกคน ค้นหา เปิดดู แก้ไขแล้วบันทึกทับ หรือลบทิ้ง (ลิงก์แชร์จะหยุดทำงานทันที) พร้อมสถิติการใช้งานรายเดือนและโปรไฟล์ตัวแทนที่แก้ได้'],
];

const GUIDE_TIPS = [
  ['ปรับสมมติฐานรายเคสได้', 'ในแบบสอบถามมีแผงปรับอัตราเงินเฟ้อ ผลตอบแทน และอายุคาดหมาย ถ้าเคสไหนต้องใช้สมมติฐานต่างจากค่ากลาง'],
  ['โหมดมืด', 'ปุ่มรูปพระอาทิตย์/พระจันทร์มุมขวาบน สลับสว่าง–มืด (เวลาพิมพ์ระบบบังคับเป็นโหมดสว่างให้เอง)'],
  ['เปิดจากแอป LINE', 'ถ้าเปิดลิงก์ในเบราว์เซอร์ของแอป LINE โดยเฉพาะบน Android ปุ่มบันทึก PDF อาจไม่ทำงาน ให้กด "เปิดในเบราว์เซอร์" (Chrome/Safari) ก่อน'],
  ['ใช้บน iPad ระหว่างนัด', 'ออกแบบให้กรอกบนมือถือและ iPad ได้ กรอกทีละขั้น เลื่อนขึ้นบนสุดอัตโนมัติเมื่อเปลี่ยนขั้น'],
];

export function renderGuide({ onBack, onStart } = {}) {
  const steps = h('ol', { class: 'guide-steps' });
  GUIDE_STEPS.forEach(([t, d], i) => {
    steps.append(h('li', {},
      h('div', { class: 'gs-num' }, String(i + 1)),
      h('div', {}, h('div', { class: 'gs-t' }, t), h('div', { class: 'gs-d' }, d))));
  });

  const tips = h('div', { class: 'guide-tips' });
  GUIDE_TIPS.forEach(([t, d]) => {
    tips.append(h('div', { class: 'guide-tip' },
      h('div', { class: 'gt-t' }, t), h('div', { class: 'gt-d' }, d)));
  });

  return h('div', { class: 'doc-page' },
    h('div', { class: 'doc-head' },
      h('h1', {}, 'วิธีใช้'),
      h('p', {}, `${BRAND_TH} ช่วยสรุปบทสนทนากับลูกค้าเป็นอินโฟกราฟิก Protection Gap ในหน้าเดียว — ใช้ได้ตั้งแต่คัดกรองผู้มุ่งหวังจนถึงส่งรายงานให้ลูกค้า`)),
    steps,
    h('h2', { class: 'doc-h2' }, 'เคล็ดลับการใช้งาน'),
    tips,
    h('div', { class: 'doc-note' },
      h('b', {}, 'ข้อควรทราบ: '),
      `ตัวเลขทั้งหมดเป็นการประมาณการเพื่อประกอบการวางแผน ไม่ใช่ตารางผลประโยชน์ของบริษัทประกัน และไม่ใช่การเสนอขายกรมธรรม์ การเลือกแบบประกันและบริษัทเป็นบทบาทของตัวแทน`),
    h('div', { class: 'doc-actions' },
      onStart ? h('button', { class: 'btn btn-primary ap-fill', onclick: () => onStart() }, 'เริ่มวิเคราะห์') : null,
      h('a', { href: '#', class: 'btn btn-ghost', onclick: (e) => { e.preventDefault(); onBack?.(); } }, '← กลับไปหน้าเครื่องมือ')));
}

/* ---------------- ติดต่อเรา ---------------- */

export function renderContact({ onBack, onSupport } = {}) {
  const rows = h('div', { class: 'contact-rows' });
  if (CONTACT.email) {
    rows.append(contactRow('อีเมล', CONTACT.email,
      h('a', { class: 'btn btn-secondary', href: `mailto:${CONTACT.email}` }, 'ส่งอีเมล')));
  }
  if (CONTACT.lineUrl || CONTACT.lineId) {
    rows.append(contactRow('LINE', CONTACT.lineId || 'เพิ่มเพื่อน',
      CONTACT.lineUrl ? h('a', { class: 'btn btn-secondary', href: CONTACT.lineUrl, target: '_blank', rel: 'noopener' }, 'เปิด LINE ↗') : null));
  }
  if (CONTACT.facebookUrl) {
    rows.append(contactRow('Facebook', 'เพจ ' + BRAND_TH,
      h('a', { class: 'btn btn-secondary', href: CONTACT.facebookUrl, target: '_blank', rel: 'noopener' }, 'เปิดเพจ ↗')));
  }

  return h('div', { class: 'doc-page' },
    h('div', { class: 'doc-head' },
      h('h1', {}, 'ติดต่อเรา'),
      h('p', {}, `มีคำถาม เจอบั๊ก หรืออยากเสนอฟีเจอร์ — ยินดีรับฟังทุกเรื่อง ${BRAND_TH} พัฒนาจาก feedback ของตัวแทนที่ใช้งานจริง`)),
    rows,
    CONTACT.responseNote ? h('div', { class: 'doc-note' }, CONTACT.responseNote) : null,
    h('h2', { class: 'doc-h2' }, 'ช่วยกันพัฒนา'),
    h('ul', { class: 'contact-list' },
      h('li', {}, 'แจ้งบั๊กหรือผลคำนวณที่ดูผิดปกติ พร้อมข้อมูลที่กรอก (ไม่ต้องมีชื่อลูกค้าจริง)'),
      h('li', {}, 'เสนอฟีเจอร์หรือด้านความคุ้มครองที่อยากให้เพิ่ม'),
      h('li', {}, 'บอกต่อเพื่อนตัวแทนที่น่าจะได้ใช้ประโยชน์')),
    h('div', { class: 'doc-actions' },
      onSupport ? h('a', { href: '#', class: 'btn btn-secondary', onclick: (e) => { e.preventDefault(); onSupport(); } }, '☕ สนับสนุนโปรเจค') : null,
      h('a', { href: '#', class: 'btn btn-ghost', onclick: (e) => { e.preventDefault(); onBack?.(); } }, '← กลับไปหน้าเครื่องมือ')));
}

function contactRow(label, value, action) {
  return h('div', { class: 'contact-row' },
    h('div', {}, h('div', { class: 'cr-label' }, label), h('div', { class: 'cr-value n' }, value)),
    action || h('span', {}));
}

/* ---------------- ข้อกำหนด / นโยบายความเป็นส่วนตัว ---------------- */

// ปรับ POLICY_VERSION ที่ src/auth.js ที่เดียว เมื่อแก้ไขข้อกำหนด/นโยบาย
const LEGAL_UPDATED = (() => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(POLICY_VERSION || '');
  const mon = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  return m ? `${+m[3]} ${mon[+m[2]]} ${m[1]}` : POLICY_VERSION;
})();
const OWNER_LABEL = `ผู้พัฒนา ${BRAND_TH}`;

/** สร้างหน้าเอกสารกฎหมายจาก sections: [{ h, body }] — body เป็น string | string[] (→ bullet) | Node */
function legalDoc({ title, intro, sections, onBack }) {
  const wrap = h('div', { class: 'doc-page legal-doc' },
    h('div', { class: 'doc-head' },
      h('h1', {}, title),
      h('div', { class: 'legal-updated' }, `ปรับปรุงล่าสุด ${LEGAL_UPDATED}`),
      intro ? h('p', {}, intro) : null));

  sections.forEach(({ h: head, body }, i) => {
    wrap.append(h('h2', { class: 'doc-h2' }, `${i + 1}. ${head}`));
    // body: array — string = ย่อหน้า, array ซ้อน = bullet list
    [].concat(body).forEach((b) => {
      if (Array.isArray(b)) {
        const ul = h('ul', { class: 'legal-list' });
        b.forEach((li) => ul.append(h('li', {}, li)));
        wrap.append(ul);
      } else if (typeof b === 'string') {
        wrap.append(h('p', { class: 'legal-p' }, b));
      } else if (b) {
        wrap.append(b);
      }
    });
  });

  wrap.append(h('div', { class: 'doc-actions' },
    h('a', { href: '?view=guide', class: 'btn btn-secondary' }, 'วิธีใช้'),
    h('a', { href: '?view=contact', class: 'btn btn-secondary' }, 'ติดต่อเรา'),
    h('a', { href: '#', class: 'btn btn-ghost', onclick: (e) => { e.preventDefault(); onBack?.(); } }, '← กลับไปหน้าเครื่องมือ')));
  return wrap;
}

export function renderTerms({ onBack } = {}) {
  return legalDoc({
    title: 'ข้อกำหนดการใช้งาน',
    onBack,
    intro: `${BRAND_TH} เป็นเครื่องมือช่วยวางแผนความคุ้มครองสำหรับตัวแทนประกันชีวิตที่มีใบอนุญาต การเข้าใช้งานถือว่าคุณยอมรับข้อกำหนดนี้`,
    sections: [
      { h: 'ลักษณะของบริการ', body: [
        `${BRAND_TH} ช่วยสรุปข้อมูลที่ตัวแทนได้จากการพูดคุยกับลูกค้า ออกมาเป็นภาพช่องว่างความคุ้มครอง (Protection Gap) ประเภทประกันที่ควรพิจารณา และสิทธิลดหย่อนภาษีที่เหลือ`,
        'บริการนี้ไม่ใช่การเสนอขายกรมธรรม์ ไม่ใช่ตารางผลประโยชน์ของบริษัทประกัน และไม่ใช่คำแนะนำการลงทุนหรือการวางแผนภาษีเฉพาะบุคคล',
        'ระบบไม่ระบุชื่อแบบประกันหรือบริษัทใด การเลือกแบบประกันและบริษัทที่เหมาะสมเป็นบทบาทและความรับผิดชอบของตัวแทน',
      ] },
      { h: 'ผู้มีสิทธิใช้งาน', body: [
        'ผู้ใช้ต้องเป็นตัวแทน/นายหน้าประกันชีวิตที่มีใบอนุญาตจากสำนักงาน คปภ. หรือผู้ที่อยู่ระหว่างการอบรม/สอบเพื่อขอรับใบอนุญาตภายใต้การกำกับของต้นสังกัด',
        'ผู้ใช้ต้องมีอายุครบ 20 ปีบริบูรณ์ และให้ข้อมูลการสมัครที่เป็นความจริง',
        'บัญชี 1 บัญชีสำหรับผู้ใช้ 1 คน ห้ามใช้ร่วมกันหรือส่งต่อบัญชี',
      ] },
      { h: 'ความถูกต้องของตัวเลขและสมมติฐาน', body: [
        'ผลลัพธ์คำนวณจากข้อมูลที่ตัวแทนกรอก ร่วมกับสมมติฐานกลาง (เช่น อัตราเงินเฟ้อ อัตราผลตอบแทน อายุคาดหมาย) ที่อาจไม่ตรงกับสถานการณ์จริงของลูกค้าแต่ละราย',
        `${BRAND_TH} ไม่รับประกันความถูกต้อง ครบถ้วน หรือความเหมาะสมของผลลัพธ์ต่อกรณีใดกรณีหนึ่ง และไม่รับประกันผลลัพธ์ทางการเงินหรือภาษีที่จะเกิดขึ้นจริง`,
        'ตัวแทนควรใช้วิจารณญาณและความรู้วิชาชีพประกอบทุกครั้ง และตรวจทานตัวเลขก่อนนำไปใช้กับลูกค้า',
      ] },
      { h: 'หน้าที่ของผู้ใช้', body: [
        'กรอกข้อมูลลูกค้าตามความเป็นจริงเท่าที่ได้รับมา และรับผิดชอบต่อความถูกต้องของข้อมูลนั้น',
        'ก่อนบันทึกข้อมูลลูกค้าลงระบบ ต้องแจ้งวัตถุประสงค์และได้รับความยินยอมจากลูกค้าตามกฎหมายคุ้มครองข้อมูลส่วนบุคคล (ดูนโยบายความเป็นส่วนตัว)',
        'ปฏิบัติตามประกาศ คปภ. ว่าด้วยการเสนอขายและการปฏิบัติหน้าที่ของตัวแทน รวมถึงห้ามแสดงผลลัพธ์ในลักษณะที่ทำให้เข้าใจผิดว่าเป็นการรับประกันผลประโยชน์',
        'เก็บรักษารหัสผ่านเป็นความลับ และแจ้งเราทันทีหากพบการเข้าถึงบัญชีโดยไม่ได้รับอนุญาต',
      ] },
      { h: 'สิ่งที่ห้ามทำ', body: [[
        'ใช้บริการเพื่อการใด ๆ ที่ผิดกฎหมาย หรือละเมิดสิทธิของบุคคลอื่น',
        'กรอกหรือบันทึกข้อมูลของบุคคลที่ตนไม่มีสิทธิหรือไม่ได้รับความยินยอม',
        'พยายามเจาะระบบ ทำวิศวกรรมย้อนกลับ ดึงข้อมูลจำนวนมากโดยอัตโนมัติ หรือรบกวนการทำงานของระบบ',
        'ใช้ข้อมูลหรือผลลัพธ์เพื่อสร้างบริการที่แข่งขันกับ ' + BRAND_TH,
      ]] },
      { h: 'การประมวลผลข้อมูลส่วนบุคคลของลูกค้า (ผู้ควบคุม–ผู้ประมวลผล)', body: [
        `สำหรับข้อมูลลูกค้าผู้มุ่งหวังที่ตัวแทนกรอกและบันทึก ตัวแทนเป็น "ผู้ควบคุมข้อมูลส่วนบุคคล" และ ${BRAND_TH} เป็น "ผู้ประมวลผลข้อมูลส่วนบุคคล" ตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562`,
        [
          `${BRAND_TH} จะประมวลผลข้อมูลเฉพาะตามคำสั่งของตัวแทนและตามวัตถุประสงค์ที่ระบุในนโยบายความเป็นส่วนตัวเท่านั้น`,
          'จัดให้มีมาตรการรักษาความมั่นคงปลอดภัยที่เหมาะสม (HTTPS, การควบคุมสิทธิ์ระดับแถวข้อมูล, การเข้ารหัสรหัสผ่าน)',
          'ใช้ผู้ประมวลผลช่วง (Supabase, Vercel) ภายใต้ข้อตกลงการประมวลผลข้อมูลของผู้ให้บริการแต่ละราย และจะแจ้งตัวแทนหากมีการเปลี่ยนแปลงผู้ประมวลผลช่วงที่มีนัยสำคัญ',
          'ลบหรือส่งคืนข้อมูลเมื่อตัวแทนสั่งลบ ปิดบัญชี หรือยุติการใช้บริการ เว้นแต่ต้องเก็บตามกฎหมาย',
          'แจ้งตัวแทนโดยไม่ชักช้าเมื่อทราบเหตุละเมิดข้อมูลส่วนบุคคล เพื่อให้ตัวแทนแจ้งสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคลได้ภายใน 72 ชั่วโมงตามที่กฎหมายกำหนด',
        ],
        'ตัวแทนต้องขอความยินยอมจากลูกค้าและใช้สิทธิของเจ้าของข้อมูลในฐานะผู้ควบคุมข้อมูล',
      ] },
      { h: 'บริการให้ "ตามสภาพ" และการหยุดให้บริการ', body: [
        `${BRAND_TH} เปิดให้ใช้งานฟรี พัฒนาและดูแลโดยบุคคลเดียว ให้บริการ "ตามสภาพที่เป็นอยู่" (as-is) โดยไม่รับประกันความพร้อมใช้งานต่อเนื่อง`,
        'เราอาจปรับปรุง เปลี่ยนแปลง ระงับ หรือยุติบริการ (ทั้งหมดหรือบางส่วน) เมื่อใดก็ได้ และจะแจ้งล่วงหน้าตามสมควรหากเป็นการยุติถาวร เพื่อให้ตัวแทนส่งออกข้อมูลของตนได้',
        'ตัวแทนปิดบัญชีและลบข้อมูลผลวิเคราะห์ทั้งหมดของตนได้เองจากแดชบอร์ด (เมนูโปรไฟล์ตัวแทน)',
      ] },
      { h: 'ข้อจำกัดความรับผิด', body: [
        `เท่าที่กฎหมายอนุญาต ${BRAND_TH} และผู้พัฒนาไม่รับผิดต่อความเสียหายทางอ้อม ความเสียหายสืบเนื่อง การสูญเสียโอกาสทางธุรกิจ หรือการสูญหายของข้อมูล ที่เกิดจากการใช้หรือไม่สามารถใช้บริการได้`,
        'ความรับผิดต่อการปฏิบัติหน้าที่ตัวแทนต่อลูกค้า การให้คำแนะนำ และการปฏิบัติตามกฎหมายที่เกี่ยวข้อง เป็นของตัวแทนแต่เพียงผู้เดียว',
      ] },
      { h: 'ทรัพย์สินทางปัญญา', body: [
        `ซอฟต์แวร์ การออกแบบ ข้อความ และเครื่องหมาย ${BRAND_TH} เป็นของผู้พัฒนา`,
        'ข้อมูลลูกค้าที่ตัวแทนกรอกและบันทึก ยังคงเป็นของตัวแทน/ลูกค้า เราใช้เพื่อให้บริการตามที่ระบุในนโยบายความเป็นส่วนตัวเท่านั้น',
      ] },
      { h: 'การเปลี่ยนแปลงข้อกำหนดและกฎหมายที่ใช้บังคับ', body: [
        'เราอาจปรับปรุงข้อกำหนดนี้เป็นครั้งคราว การใช้งานต่อหลังการปรับปรุงถือว่ายอมรับข้อกำหนดฉบับใหม่',
        'ข้อกำหนดนี้อยู่ภายใต้กฎหมายไทย',
      ] },
      { h: 'ติดต่อ', body: [
        `${OWNER_LABEL} — อีเมล ${CONTACT.email || '(ระบุในหน้าติดต่อเรา)'}`,
      ] },
    ],
  });
}

export function renderPrivacy({ onBack } = {}) {
  return legalDoc({
    title: 'นโยบายความเป็นส่วนตัว',
    onBack,
    intro: `นโยบายนี้อธิบายว่า ${BRAND_TH} เก็บและใช้ข้อมูลส่วนบุคคลอย่างไร ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)`,
    sections: [
      { h: 'บทบาทของแต่ละฝ่าย', body: [
        'ข้อมูลของลูกค้าและผู้มุ่งหวัง (รวมผลวิเคราะห์ สมุดลูกค้า กรมธรรม์ที่ถืออยู่ และรายการติดตาม): ตัวแทนที่กรอกและบันทึกข้อมูลเป็น "ผู้ควบคุมข้อมูลส่วนบุคคล" (data controller) — เป็นผู้กำหนดวัตถุประสงค์และเป็นผู้ขอความยินยอมจากลูกค้า',
        `${BRAND_TH} เป็น "ผู้ประมวลผลข้อมูลส่วนบุคคล" (data processor) — ประมวลผลตามคำสั่งของตัวแทนเท่านั้น คือ เพื่อคำนวณ จัดเก็บ แสดงผลวิเคราะห์ และช่วยตัวแทนจัดการงานติดตามลูกค้า`,
        `ข้อมูลของตัวแทนเอง (บัญชีผู้ใช้): ${BRAND_TH} เป็นผู้ควบคุมข้อมูล`,
      ] },
      { h: 'ข้อมูลที่เก็บ', body: [[
        'จากตัวแทน (ตอนสมัครและตั้งค่าโปรไฟล์): อีเมล รหัสผ่าน (เก็บแบบเข้ารหัสโดยระบบยืนยันตัวตน) ชื่อที่แสดง LINE ID บริษัท เลขที่ใบอนุญาต',
        'ผลวิเคราะห์ Protection Gap (เมื่อตัวแทนเลือกบันทึก): ชื่อ อายุ เพศ สถานภาพสมรส จำนวนผู้อยู่ในอุปการะ อาชีพ/การเป็นเจ้าของกิจการ รายได้และภาระหนี้ ความคุ้มครองและกองทุนที่มีอยู่ เป้าหมายเกษียณและการศึกษาบุตร ข้อมูลภาษี',
        'สมุดลูกค้า (เมื่อตัวแทนบันทึกลูกค้าเข้าสมุด): ชื่อ-นามสกุล ชื่อเล่น วันเกิด เพศ เบอร์โทร LINE ID อาชีพ สถานภาพ และบันทึกที่ตัวแทนพิมพ์เอง',
        'กรมธรรม์ที่ลูกค้าถืออยู่ (ตามที่ตัวแทนบันทึก): ประเภทความคุ้มครอง บริษัทประกัน ชื่อแบบ ทุนประกัน เบี้ยและงวดชำระ วันครบกำหนดชำระ สถานะกรมธรรม์',
        'รายการติดตามและการคัดกรองผู้มุ่งหวัง (MANHA): หัวข้อ กำหนดวันติดตาม เหตุผลที่ตัวแทนบันทึก และผลการคัดกรองเบื้องต้น',
        'ข้อมูลอ่อนไหว (PDPA มาตรา 26 — ต้องได้รับความยินยอมโดยชัดแจ้งจากลูกค้าก่อนบันทึก): สถานะการสูบบุหรี่ · สิทธิการรักษาพยาบาล · ข้อยกเว้น เบี้ยเพิ่ม หรือเงื่อนไขจากการพิจารณารับประกันที่ตัวแทนบันทึกไว้ในกรมธรรม์ · สถานะสุขภาพที่ระบุในการคัดกรอง MANHA',
        'ข้อมูลการใช้งานทางเทคนิคเท่าที่จำเป็น เช่น เวลาที่สร้าง/แก้ไขข้อมูล (ระบบไม่ติดตั้งเครื่องมือวิเคราะห์พฤติกรรมของบุคคลที่สาม)',
      ]] },
      { h: 'ฐานการประมวลผลและวัตถุประสงค์', body: [
        'ข้อมูลลูกค้า: ประมวลผลบนฐาน "ความยินยอม" ที่ตัวแทนขอจากลูกค้า เพื่อจัดทำผลวิเคราะห์ความต้องการความคุ้มครอง จัดทำเอกสาร PDF และลิงก์สรุปสำหรับลูกค้า จัดเก็บกรมธรรม์ที่ลูกค้าถืออยู่ และช่วยตัวแทนวางแผนการติดต่อและบริการหลังการขาย',
        'ข้อมูลบัญชีตัวแทน: ประมวลผลบนฐานการปฏิบัติตามสัญญาการใช้บริการ เพื่อยืนยันตัวตน ให้เข้าถึงแดชบอร์ด และแสดงชื่อ/ใบอนุญาตบนรายงาน',
        'หากไม่บันทึก ระบบจะคำนวณในเครื่องของผู้ใช้และไม่ส่งข้อมูลลูกค้าไปเก็บที่เซิร์ฟเวอร์',
      ] },
      { h: 'การเก็บรักษาและการลบ', body: [
        'ผลวิเคราะห์ ข้อมูลลูกค้าในสมุด กรมธรรม์ และรายการติดตาม จะถูกเก็บจนกว่าตัวแทนจะลบ ตัวแทนลบแต่ละรายการได้ตลอดเวลา และการลบมีผลถาวร',
        'เมื่อตัวแทนลบลูกค้าออกจากสมุด ระบบจะลบกรมธรรม์และรายการติดตามของลูกค้าคนนั้นด้วย ตัวแทนเลือกได้ว่าจะลบผลวิเคราะห์ที่ผูกไว้พร้อมกันหรือไม่',
        'ลิงก์สรุปสำหรับลูกค้า (แชร์) มีอายุ 90 วันนับจากสร้าง หลังจากนั้นเปิดไม่ได้',
        'ตัวแทนปิดบัญชีได้เองจากแดชบอร์ด (เมนูโปรไฟล์ตัวแทน → ปิดบัญชีและลบข้อมูลทั้งหมด) — เมื่อปิดบัญชี ระบบจะลบบัญชี ผลวิเคราะห์ สมุดลูกค้า กรมธรรม์ และรายการติดตามทั้งหมดทันที และลิงก์แชร์ทุกลิงก์จะหยุดทำงาน',
      ] },
      { h: 'การเปิดเผยและผู้ให้บริการภายนอก', body: [
        'ระบบไม่เปิดเผยข้อมูลลูกค้าของตัวแทนรายหนึ่งให้ตัวแทนรายอื่น โดยบังคับด้วยการควบคุมสิทธิ์ระดับแถวข้อมูล (Row Level Security)',
        `${BRAND_TH} ไม่ขายหรือให้เช่าข้อมูลส่วนบุคคล`,
        'ผู้ให้บริการโครงสร้างพื้นฐานที่ประมวลผลข้อมูลแทนเรา: Supabase (ฐานข้อมูลและระบบยืนยันตัวตน จัดเก็บในเขตประเทศสิงคโปร์) และ Vercel (โฮสต์เว็บแอป) ภายใต้ข้อตกลงการประมวลผลข้อมูลของผู้ให้บริการแต่ละราย',
        'อาจเปิดเผยเมื่อมีคำสั่งโดยชอบด้วยกฎหมายจากหน่วยงานที่มีอำนาจ',
      ] },
      { h: 'การส่งหรือโอนข้อมูลไปต่างประเทศ', body: [
        'ข้อมูลถูกจัดเก็บบนเซิร์ฟเวอร์ในสิงคโปร์ และอาจมีการประมวลผลในประเทศอื่นที่ผู้ให้บริการข้างต้นดำเนินการ เราเลือกผู้ให้บริการที่มีมาตรการคุ้มครองข้อมูลที่เหมาะสม',
      ] },
      { h: 'มาตรการความปลอดภัยและการแจ้งเหตุละเมิด', body: [[
        'เชื่อมต่อผ่าน HTTPS ทั้งหมด',
        'การควบคุมสิทธิ์ระดับแถวข้อมูล ทำให้แต่ละบัญชีเข้าถึงได้เฉพาะข้อมูลของตนเอง',
        'รหัสผ่านจัดการโดยระบบยืนยันตัวตนของ Supabase ไม่ถูกเก็บเป็นข้อความธรรมดา',
        'กุญแจที่ฝังในเว็บแอป (anon key) เป็นกุญแจสาธารณะที่ออกแบบให้ปลอดภัยต่อการเปิดเผย โดยการควบคุมสิทธิ์จริงอยู่ที่นโยบายฝั่งฐานข้อมูล',
        'หากเกิดเหตุละเมิดข้อมูลส่วนบุคคล เราจะแจ้งตัวแทน (ในฐานะผู้ควบคุมข้อมูล) โดยไม่ชักช้า เพื่อให้แจ้งสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคลได้ภายใน 72 ชั่วโมงตามที่กฎหมายกำหนด',
      ]] },
      { h: 'คุกกี้และการจัดเก็บในเบราว์เซอร์', body: [
        'ระบบใช้ localStorage ในเบราว์เซอร์เพื่อจำสถานะการเข้าสู่ระบบและการตั้งค่าโหมดสว่าง/มืดเท่านั้น',
        'ไม่มีคุกกี้เพื่อการโฆษณาหรือการติดตามข้ามเว็บไซต์ และไม่ใช้เครื่องมือวัดสถิติของบุคคลที่สาม',
      ] },
      { h: 'สิทธิของเจ้าของข้อมูลส่วนบุคคล', body: [[
        'ลูกค้าผู้มุ่งหวังมีสิทธิขอเข้าถึง ขอสำเนา ขอแก้ไข ขอลบ ขอให้ระงับการใช้ คัดค้านการประมวลผล ขอให้โอนข้อมูล และเพิกถอนความยินยอมเมื่อใดก็ได้ โดยติดต่อผ่านตัวแทนที่เก็บข้อมูล (ผู้ควบคุมข้อมูล)',
        `ตัวแทนมีสิทธิเดียวกันต่อข้อมูลบัญชีของตน โดยติดต่อ ${BRAND_TH} โดยตรง`,
        'มีสิทธิร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล หากเห็นว่าการประมวลผลไม่ชอบด้วยกฎหมาย',
      ]] },
      { h: 'การเปลี่ยนแปลงนโยบาย', body: [
        'เราอาจปรับปรุงนโยบายนี้เป็นครั้งคราว และจะระบุวันที่ปรับปรุงล่าสุดไว้ที่ต้นเอกสาร การเปลี่ยนแปลงที่มีนัยสำคัญจะแจ้งให้ทราบผ่านแอปหรืออีเมล',
      ] },
      { h: 'ติดต่อเรื่องข้อมูลส่วนบุคคล', body: [
        `${OWNER_LABEL} — อีเมล ${CONTACT.email || '(ระบุในหน้าติดต่อเรา)'}`,
        'สำหรับคำขอใช้สิทธิที่เกี่ยวกับข้อมูลลูกค้า กรุณาติดต่อตัวแทนที่ให้บริการคุณเป็นลำดับแรก เนื่องจากตัวแทนเป็นผู้ควบคุมข้อมูลนั้น',
      ] },
    ],
  });
}

/* ---------------- Auth (email + password) ---------------- */

const asideBlock = () => h('div', { class: 'auth-aside' },
  brand(22),
  h('div', { class: 'grow' }),
  h('h2', {}, 'สรุป Protection Gap', h('br'), 'ให้ลูกค้าเห็นภาพใน 5 วินาที'),
  h('p', {}, 'บันทึกผลวิเคราะห์ลูกค้าทุกคนไว้ที่เดียว เปิดดู/แก้ไข/แชร์ได้ทุกเมื่อ'),
  h('div', { class: 'rule' }),
  h('div', { class: 'fine' }, 'เครื่องมือสำหรับตัวแทนประกันชีวิต สุขภาพ สะสมทรัพย์ และยูนิตลิงก์'));

const field = (label, input) => h('div', { class: 'field ap-f', style: 'max-width:340px' }, h('label', {}, label), input);

/**
 * @param {{mode:'signin'|'signup'|'reset'|'recover', onSignIn, onSignUp, onReset, onSetPassword, onSwitch, onBack}} opts
 */
export function renderAuth(opts = {}) {
  const mode = opts.mode || 'signin';
  const main = h('div', { class: 'auth-main' });
  main.append(h('div', { class: 'auth-mobile-brand' }, brand(22))); // โชว์เฉพาะจอมือถือ (aside ถูกซ่อน)
  const msg = h('div', { class: 'auth-fine' });
  const setMsg = (text, ok) => { msg.style.color = ok ? 'var(--ap-ok)' : 'var(--ap-bad)'; msg.textContent = text; };
  const busy = (btn, on) => { btn.disabled = on; btn.textContent = on ? 'กำลังดำเนินการ…' : btn.dataset.label; };

  if (mode === 'recover') {
    const pw = h('input', { class: 'input', type: 'password', placeholder: 'รหัสผ่านใหม่', autocomplete: 'new-password', style: 'min-height:42px' });
    const btn = h('button', { class: 'btn btn-primary ap-fill', 'data-label': 'บันทึกรหัสผ่านใหม่', style: 'justify-content:center;margin-top:14px;min-height:42px;max-width:340px',
      onclick: async () => {
        if (pw.value.length < 6) return setMsg('รหัสผ่านอย่างน้อย 6 ตัวอักษร');
        busy(btn, true);
        try { await opts.onSetPassword?.(pw.value); setMsg('เปลี่ยนรหัสผ่านแล้ว กำลังเข้าสู่ระบบ…', true); }
        catch (e) { setMsg(e.message); busy(btn, false); }
      } });
    btn.textContent = btn.dataset.label;
    main.append(h('h1', {}, 'ตั้งรหัสผ่านใหม่'), h('div', { class: 'lede' }, 'กรอกรหัสผ่านใหม่ที่ต้องการใช้'), field('รหัสผ่านใหม่', pw), btn, msg);
    return h('div', { class: 'auth-card elev-md' }, asideBlock(), main);
  }

  if (mode === 'reset') {
    if (!EMAIL_ENABLED) {
      main.append(
        h('h1', {}, 'ลืมรหัสผ่าน'),
        h('div', { class: 'lede' }, 'ตอนนี้ระบบส่งอีเมลอัตโนมัติยังไม่พร้อมใช้งาน'),
        h('p', { style: 'font-size:13px;color:var(--ap-ink2);line-height:1.7;max-width:340px' },
          'กรุณาติดต่อผู้พัฒนาเพื่อขอรีเซ็ตรหัสผ่าน',
          CONTACT.email ? h('span', {}, ' — อีเมล ', h('a', { href: `mailto:${CONTACT.email}` }, CONTACT.email)) : null),
        h('div', { class: 'auth-switch' }, h('a', { href: '#', onclick: (e) => { e.preventDefault(); opts.onSwitch?.('signin'); } }, '← กลับไปเข้าสู่ระบบ')));
      return h('div', { class: 'auth-card elev-md' }, asideBlock(), main);
    }
    const email = h('input', { class: 'input', type: 'email', placeholder: 'you@example.com', autocomplete: 'email', style: 'min-height:42px' });
    const btn = h('button', { class: 'btn btn-primary ap-fill', 'data-label': 'ส่งลิงก์รีเซ็ตรหัสผ่าน', style: 'justify-content:center;margin-top:14px;min-height:42px;max-width:340px',
      onclick: async () => {
        if (!email.value.trim()) return;
        busy(btn, true);
        try { await opts.onReset?.(email.value.trim()); setMsg('ถ้ามีบัญชีที่ใช้อีเมลนี้ ระบบได้ส่งลิงก์รีเซ็ตรหัสผ่านไปแล้ว', true); }
        catch (e) { setMsg(e.message); }
        busy(btn, false);
      } });
    btn.textContent = btn.dataset.label;
    main.append(
      h('h1', {}, 'ลืมรหัสผ่าน'),
      h('div', { class: 'lede' }, 'กรอกอีเมล เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้'),
      field('อีเมล', email), btn, msg,
      h('div', { class: 'auth-switch' }, h('a', { href: '#', onclick: (e) => { e.preventDefault(); opts.onSwitch?.('signin'); } }, '← กลับไปเข้าสู่ระบบ')));
    return h('div', { class: 'auth-card elev-md' }, asideBlock(), main);
  }

  // signin / signup
  const isSignup = mode === 'signup';
  const email = h('input', { class: 'input', type: 'email', placeholder: 'you@example.com', autocomplete: 'email', style: 'min-height:42px' });
  const pw = h('input', { class: 'input', type: 'password', placeholder: '••••••••', autocomplete: isSignup ? 'new-password' : 'current-password', style: 'min-height:42px' });
  const name = h('input', { class: 'input', placeholder: 'ชื่อที่จะแสดงบนรายงานให้ลูกค้าเห็น', style: 'min-height:42px' });
  const consent = h('input', { type: 'checkbox' });
  const consentRow = h('label', { class: 'auth-consent' },
    consent,
    h('span', {}, 'ฉันได้อ่านและยอมรับ ',
      h('a', { href: '?view=terms', target: '_blank', rel: 'noopener' }, 'ข้อกำหนดการใช้งาน'),
      ' และ ',
      h('a', { href: '?view=privacy', target: '_blank', rel: 'noopener' }, 'นโยบายความเป็นส่วนตัว (PDPA)'),
      ' — ในฐานะผู้ควบคุมข้อมูล ฉันจะแจ้งวัตถุประสงค์และขอความยินยอมจากลูกค้าก่อนบันทึกข้อมูลส่วนบุคคล'));

  const btn = h('button', { class: 'btn btn-primary ap-fill', 'data-label': isSignup ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ',
    style: 'justify-content:center;margin-top:16px;min-height:42px;max-width:340px',
    onclick: async () => {
      const e2 = email.value.trim();
      if (!e2 || pw.value.length < 1) return setMsg('กรอกอีเมลและรหัสผ่าน');
      if (isSignup && pw.value.length < 6) return setMsg('รหัสผ่านอย่างน้อย 6 ตัวอักษร');
      if (isSignup && !consent.checked) return setMsg('กรุณาติ๊กยอมรับข้อกำหนดและนโยบายความเป็นส่วนตัวก่อนสมัคร');
      busy(btn, true);
      try {
        if (isSignup) {
          const { needsConfirm } = await opts.onSignUp?.({ email: e2, password: pw.value, displayName: name.value.trim() }) || {};
          if (needsConfirm) setMsg('สมัครแล้ว — กรุณายืนยันอีเมลจากลิงก์ที่ส่งไป แล้วเข้าสู่ระบบ', true);
          else setMsg('สมัครสำเร็จ กำลังเข้าสู่ระบบ…', true);
        } else {
          await opts.onSignIn?.({ email: e2, password: pw.value });
        }
      } catch (e) { setMsg(e.message); busy(btn, false); }
    } });
  btn.textContent = btn.dataset.label;

  const tabs = h('div', { class: 'auth-tabs' },
    tab('เข้าสู่ระบบ', !isSignup, () => opts.onSwitch?.('signin')),
    tab('สมัครสมาชิก', isSignup, () => opts.onSwitch?.('signup')));

  [
    tabs,
    h('div', { class: 'lede' }, isSignup ? 'สมัครฟรีด้วยอีเมลและรหัสผ่าน' : 'เข้าสู่ระบบเพื่อดูและแก้ไขข้อมูลลูกค้าของคุณ'),
    isSignup ? field('ชื่อ-นามสกุล (ตัวแทน)', name) : null,
    field('อีเมล', email),
    field('รหัสผ่าน', pw),
    isSignup ? consentRow : null,
    btn, msg,
    !isSignup ? h('div', { class: 'auth-switch' }, h('a', { href: '#', onclick: (e) => { e.preventDefault(); opts.onSwitch?.('reset'); } }, 'ลืมรหัสผ่าน?')) : null,
    !isSignup ? h('div', { class: 'auth-fine' }, 'การใช้งานถือว่ายอมรับ ', h('a', { href: '?view=terms' }, 'ข้อกำหนดการใช้งาน'), ' และ ', h('a', { href: '?view=privacy' }, 'นโยบายความเป็นส่วนตัว (PDPA)')) : null,
    h('hr', { class: 'hr', style: 'margin:22px 0 0;max-width:340px' }),
    h('div', { style: 'font-size:12.5px;color:var(--ap-ink2);margin-top:14px' },
      'กลับไปหน้าเครื่องมือ? ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); opts.onBack?.(); } }, 'เริ่มวิเคราะห์')),
  ].filter(Boolean).forEach((n) => main.append(n));
  return h('div', { class: 'auth-card elev-md' }, asideBlock(), main);
}

function tab(label, active, onClick) {
  return h('button', { class: 'auth-tab' + (active ? ' on' : ''), onclick: onClick }, label);
}

/* ---------------- Landing ---------------- */

const SEV_PREVIEW = [
  ['ประกันโรคร้ายแรง', 100, '#d64545'],
  ['ทุนการศึกษาบุตร', 97, '#d64545'],
  ['ประกันชีวิต', 89, '#e0902a'],
  ['อุบัติเหตุ / ทุพพลภาพ', 88, '#e0902a'],
  ['เงินออมเพื่อเกษียณ', 82, '#e0902a'],
  ['ประกันสุขภาพ', 70, '#e0902a'],
];

const TEAM_MAILTO = `mailto:${CONTACT.email || ''}?subject=${encodeURIComponent('สนใจแพ็กเกจ Team — KhumPlan')}&body=${encodeURIComponent('ชื่อ:\nบริษัท/สังกัด:\nจำนวนตัวแทนในทีม:\nอยากคุยเรื่อง:')}`;

export function renderLanding({ onStart, onPreview, onSignup, onLogin } = {}) {
  const go = (fn) => (e) => { e?.preventDefault?.(); fn?.(); };
  const wrap = h('div', { class: 'landing' },
    // ── mini topbar ──
    h('div', { class: 'landing-topbar' },
      brand(22),
      h('a', { href: '?view=auth', class: 'topbar-link', onclick: go(onLogin) }, 'เข้าสู่ระบบ')),

    // ── hero ──
    h('div', { class: 'landing-hero' },
      h('div', {},
        h('span', { class: 'tag p-info' }, 'สำหรับตัวแทนประกันชีวิต · สุขภาพ · สะสมทรัพย์ · ยูนิตลิงก์'),
        h('h1', {}, 'ลูกค้าเห็นช่องว่าง', h('br'), 'ก่อนที่คุณจะต้องอธิบาย'),
        h('p', {}, 'กรอกข้อมูลจากบทสนทนากับลูกค้า ~3 นาที ระบบสรุปเป็นอินโฟกราฟิก Protection Gap 6 ด้าน พร้อมประเภทประกันที่ควรพิจารณาและสิทธิลดหย่อนภาษีที่เหลือ — พิมพ์ PDF หน้าเดียว หรือส่งลิงก์ให้ลูกค้าได้ทันที'),
        h('div', { class: 'cta' },
          h('button', { class: 'btn btn-primary ap-fill', style: 'min-height:42px;padding:0 20px', onclick: go(onSignup) }, 'เริ่มใช้ฟรี'),
          h('button', { class: 'btn btn-secondary', style: 'min-height:42px;padding:0 18px', onclick: go(onPreview) }, 'ดูตัวอย่างผลลัพธ์')),
        h('div', { class: 'fine' }, 'ฟรี · ไม่ต้องใส่บัตรเครดิต · ใช้บนมือถือและ iPad ได้ทันที')
      ),
      h('div', { class: 'hero-preview' },
        h('div', { class: 'cap' }, 'ตัวอย่างสรุป'),
        h('div', { style: 'display:flex;align-items:center;gap:14px;margin-top:12px' },
          ringGauge(26, 66),
          h('div', {}, h('div', { style: 'font-size:11.5px;color:rgba(234,238,245,.6)' }, 'คะแนนความพร้อม · เริ่มต้น'),
            h('div', { style: 'font-size:13.5px;font-weight:600;margin-top:2px' }, 'ก้าวแรก: เริ่มที่ประกันโรคร้ายแรง'))),
        h('div', { style: 'display:flex;flex-direction:column;gap:8px;margin-top:18px' },
          ...SEV_PREVIEW.map(([label, pct, color]) =>
            h('div', { class: 'row' }, h('span', {}, label),
              h('div', { class: 'rtrack' }, h('div', { style: `width:${pct}%;height:100%;border-radius:4px;background:${color}` })))))
      )
    ),
    h('hr', { class: 'hr', style: 'margin:0' }),

    // ── proof / see it ──
    h('div', { class: 'landing-section land-proof' },
      h('h2', {}, 'ดูของจริงก่อนตัดสินใจ'),
      h('p', { class: 'land-sub' }, 'โหลดตัวอย่างผลวิเคราะห์ที่กรอกข้อมูลไว้แล้ว — เห็นหน้าสรุป พีระมิด ตาราง 6 ด้าน และหน้า PDF โดยไม่ต้องสมัคร'),
      h('button', { class: 'btn btn-primary ap-fill', style: 'min-height:42px;padding:0 22px;margin-top:16px', onclick: go(onPreview) }, 'เปิดตัวอย่างผลลัพธ์เต็ม')),
    h('hr', { class: 'hr', style: 'margin:0' }),

    // ── how it works ──
    section('ทำงานยังไง',
      h('div', { class: 'cols-3 land-steps' },
        stepCard('1', 'คัดกรองก่อน (ถ้าต้องการ)', 'ตอบ MANHA 5 ข้อสั้น ๆ ระบบบอกว่าควรลงเวลากับผู้มุ่งหวังคนนี้เลย หรือเก็บไว้ตามภายหลัง'),
        stepCard('2', 'กรอกจากบทสนทนา', 'แบบสอบถาม 6 ขั้น ~3 นาที กรอกเท่าที่รู้ก่อนได้ ช่องที่เว้นไว้ระบบใช้ค่ามาตรฐาน'),
        stepCard('3', 'ได้ผลทันที', 'อินโฟกราฟิก 6 ด้าน + พีระมิดการเงิน + สิทธิลดหย่อนภาษี · พิมพ์ PDF A4 หรือส่งลิงก์ให้ลูกค้า'))),
    h('hr', { class: 'hr', style: 'margin:0' }),

    // ── features ──
    section('สิ่งที่ได้', h('div', { class: 'cols-2' },
      feat('M2.5 13.5V9m4 4.5V5.5m4 8V2.5m4 11V7', 'วิเคราะห์ 6 ด้าน', 'ชีวิต/คุ้มครองรายได้ · สุขภาพ · โรคร้ายแรง · อุบัติเหตุ/ทุพพลภาพ · เกษียณ · ทุนการศึกษาบุตร'),
      feat('M8 1.5L2 5v4.5C2 12.5 4.5 15 8 15s6-2.5 6-5.5V5z', 'นำด้วย "ก้าวแรก"', 'บอกว่าควรเริ่มเติมด้านไหนก่อน ไม่ยิงตัวเลขหลักสิบล้านใส่หน้าลูกค้าให้ตกใจ'),
      feat(['M5 6V2.5h6V6M4 6h8v5H4z', 'M5.5 11v2.5h5V11'], 'พิมพ์ PDF A4 หน้าเดียว', 'มีชื่อและเลขใบอนุญาตของคุณบนหัวกระดาษ อ่านออกแม้พิมพ์ขาวดำ'),
      feat('M6.5 9.5a3 3 0 004.2 0l2-2a3 3 0 10-4.2-4.2l-.6.6M9.5 6.5a3 3 0 00-4.2 0l-2 2a3 3 0 104.2 4.2l.6-.6', 'แชร์ลิงก์ให้ลูกค้า', 'หน้าอ่านอย่างเดียว อายุ 90 วัน มีชื่อและ LINE ของคุณติดอยู่'),
      feat('M8 4v4l3 2M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13z', 'สิทธิลดหย่อนภาษีที่เหลือ', 'คำนวณภาษีก่อน–หลัง บอกว่ายังใช้สิทธิประกันชีวิต/บำนาญได้อีกเท่าไหร่'),
      feat('M2.5 3h11v10.5h-11zM2.5 6.5h11', 'สมุดลูกค้า + เตือน LINE', 'เก็บผลวิเคราะห์ทุกคน + เตือนต่ออายุ/วันเกิด — เร็ว ๆ นี้ (Pro)'))),
    h('hr', { class: 'hr', style: 'margin:0' }),

    // ── differentiation ──
    section('ทำไมไม่ใช้โปรแกรมของบริษัท หรือ CRM ทั่วไป', h('div', { class: 'cols-2 land-vs' },
      vsCard('vs โปรแกรม illustration ของบริษัท',
        'อันนั้นคือตารางผลประโยชน์ของผลิตภัณฑ์เดียว บริษัทเดียว ทำมาเพื่อปิดการขาย', 'KhumPlan เห็นภาพรวมทั้ง 6 ความต้องการ ไม่ผูกบริษัท — ใช้เครื่องมือเดียวได้ไม่ว่าสุดท้ายจะวางผลิตภัณฑ์บริษัทไหน'),
      vsCard('vs CRM ทั่วไป',
        'อันนั้นคือกล่องเปล่า ต้องออกแบบ pipeline และฟิลด์เอง ให้แค่ "ที่เก็บเบอร์"', 'KhumPlan สร้างมารอบงาน needs-analysis ประกันอยู่แล้ว — ให้ "เหตุผลที่ต้องโทรหา" ลูกค้า (ช่องว่าง ต่ออายุ โอกาสเสนอเพิ่ม)'))),
    h('hr', { class: 'hr', style: 'margin:0' }),

    // ── compliance / trust ──
    h('div', { class: 'landing-section land-trust' },
      h('h2', {}, 'ปลอดภัยเรื่อง คปภ. และ PDPA'),
      h('ul', { class: 'land-trust-list' },
        h('li', {}, 'ไม่ระบุชื่อแบบประกันหรือบริษัทใด — แนะนำเป็นประเภทความคุ้มครองเท่านั้น'),
        h('li', {}, 'ไม่ใช่ตารางผลประโยชน์ ไม่ใช่การเสนอขายกรมธรรม์ มีข้อความกำกับทุกหน้าผล'),
        h('li', {}, 'ตัวแทนเป็นผู้ควบคุมข้อมูล — ข้อมูลลูกค้าของคุณไม่แชร์ให้ตัวแทนคนอื่น'),
        h('li', {}, 'ก่อนบันทึกต้องยืนยันว่าได้รับความยินยอมจากลูกค้า (PDPA) · ลบได้ตลอดเวลา'))),
    h('hr', { class: 'hr', style: 'margin:0' }),

    // ── team leaders ──
    h('div', { class: 'landing-section land-team' },
      h('div', { class: 'land-team-card' },
        h('div', {},
          h('div', { class: 'lt-kicker' }, 'สำหรับหัวหน้าทีม'),
          h('h2', {}, 'มีทีมในความดูแล?'),
          h('p', {}, 'KhumPlan กำลังพัฒนาแพ็กเกจ Team — แดชบอร์ดหัวหน้าทีม (ใครยัง active · จำนวนเคส · ยอดรวมทีม แบบไม่เห็นข้อมูลลูกค้าของลูกทีม) · onboarding ตัวแทนใหม่ · สมมติฐานมาตรฐานทีม · โลโก้ทีมบนทุกรายงาน'),
          h('div', { class: 'lt-note' }, 'ผู้ที่แจ้งความสนใจตอนนี้ได้ราคา Founding ล็อก 2 ปี')),
        h('a', { class: 'btn btn-primary ap-fill', style: 'min-height:42px;padding:0 20px;white-space:nowrap', href: TEAM_MAILTO }, 'สนใจแพ็กเกจ Team →'))),
    h('hr', { class: 'hr', style: 'margin:0' }),

    // ── pricing transparency ──
    h('div', { class: 'landing-section land-price' },
      h('h2', {}, 'ราคา'),
      h('p', { class: 'land-sub' }, h('b', {}, 'เครื่องมือวิเคราะห์หลัก (MANHA + Protection Gap + PDF + ลิงก์แชร์) ฟรีตลอดไป'), ' — แพ็กเกจ Pro (สมุดลูกค้า + เตือน LINE) และ Team (ฟีเจอร์ทีม) แบบเสียเงินกำลังพัฒนา · ผู้ใช้รุ่นแรกได้ราคา Founding ล็อกถาวร')),

    faq(),

    // ── final CTA + footer ──
    h('div', { class: 'landing-foot' },
      h('div', { style: 'display:flex;align-items:flex-end;gap:26px;flex-wrap:wrap' },
        h('div', { style: 'flex:1' },
          h('h2', { style: 'font-size:22px' }, 'เริ่มจากลูกค้าคนถัดไปของคุณ'),
          h('div', { style: 'font-size:12.5px;color:rgba(234,238,245,.6);margin-top:7px' }, 'สมัครฟรีด้วยอีเมลและรหัสผ่าน ~30 วินาที')),
        h('button', { class: 'btn btn-secondary', style: 'border-color:#4f9bff;color:#9dc6ff;min-height:42px;padding:0 22px', onclick: go(onSignup) }, 'เริ่มใช้ฟรี')),
      h('div', { style: 'height:1px;margin:26px 0 18px;background:linear-gradient(to right,transparent,rgba(234,238,245,.2) 48px,rgba(234,238,245,.2) calc(100% - 48px),transparent)' }),
      h('div', { style: 'display:flex;gap:20px;align-items:center;font-size:11.5px;color:rgba(234,238,245,.5);flex-wrap:wrap' },
        h('span', { style: 'font-weight:600;color:rgba(234,238,245,.8)' }, BRAND),
        h('a', { class: 'foot-a', href: '?view=guide' }, 'วิธีใช้'),
        h('a', { class: 'foot-a', href: '?view=terms' }, 'ข้อกำหนดการใช้งาน'),
        h('a', { class: 'foot-a', href: '?view=privacy' }, 'นโยบายความเป็นส่วนตัว (PDPA)'),
        h('a', { class: 'foot-a', href: '?view=contact' }, 'ติดต่อเรา'),
        h('span', { style: 'margin-left:auto' }, 'เครื่องมือช่วยวางแผน ไม่ใช่การเสนอขายผลิตภัณฑ์ประกันภัย'))
    )
  );
  return wrap;
}

function stepCard(n, t, d) {
  return h('div', { class: 'step-card' },
    h('div', { class: 'sc-num' }, n),
    h('div', { class: 'sc-t' }, t),
    h('div', { class: 'sc-d' }, d));
}
function vsCard(head, them, us) {
  return h('div', { class: 'vs-card' },
    h('div', { class: 'vs-head' }, head),
    h('div', { class: 'vs-them' }, them),
    h('div', { class: 'vs-us' }, us));
}

function section(title, ...body) {
  return h('div', { class: 'landing-section' }, h('h2', {}, title), ...body);
}
function probCard(t, d) {
  return h('div', { class: 'card ap-g elev-sm', style: 'background:var(--ap-bg);border-color:transparent' },
    h('div', { style: 'font-size:14.5px;font-weight:600' }, t),
    h('div', { style: 'font-size:12.5px;color:var(--ap-ink2);line-height:1.65' }, d));
}
function feat(d, t, dsc) {
  return h('div', { class: 'feat' },
    h('div', { class: 'ico' }, icon(d, { size: 16, stroke: 'var(--ap-pri-ink)' })),
    h('div', {}, h('div', { class: 'ft' }, t), h('div', { class: 'fd' }, dsc)));
}
function faq() {
  const items = [
    ['เครื่องมือนี้แนะนำแบบประกันของบริษัทไหน', 'ไม่แนะนำแบบประกันหรือบริษัทใดเลย ระบบสรุปเฉพาะประเภทความคุ้มครองที่ควรพิจารณา การเลือกแบบและบริษัทเป็นบทบาทของตัวแทน'],
    ['ตัวเลขที่ได้เป็นการรับประกันผลประโยชน์หรือไม่', 'ไม่ใช่ ทุกหน้าผลมีข้อความกำกับชัดเจนว่าเป็นการประมาณการเพื่อประกอบการวางแผน ไม่ใช่ตารางผลประโยชน์ของบริษัทประกัน'],
    ['ข้อมูลลูกค้าเก็บอย่างไร', 'ตัวแทนต้องได้รับความยินยอมจากลูกค้าก่อนบันทึกข้อมูลตามหลัก PDPA หน้าแชร์แสดงเฉพาะข้อมูลที่จำเป็น และลบผลวิเคราะห์ได้ตลอดเวลา'],
    ['ใช้บน iPad ระหว่างนัดลูกค้าได้ไหม', 'ออกแบบมาให้ใช้บน iPad และมือถือเป็นหลัก ฟอร์มแบ่งเป็น 6 ขั้นกรอกเร็ว'],
    ['ราคาเท่าไหร่', 'เครื่องมือวิเคราะห์หลัก MANHA + Protection Gap + PDF + ลิงก์แชร์ ฟรีตลอดไป แพ็กเกจ Pro (สมุดลูกค้า + เตือน LINE) และ Team กำลังพัฒนา ผู้ใช้รุ่นแรกจะได้ราคา Founding ล็อกถาวร'],
  ];
  const box = h('div', {});
  items.forEach(([q, a], i) => {
    if (i) box.append(h('hr', { class: 'hr', style: 'margin:0' }));
    box.append(h('div', { style: 'padding:15px 0' },
      h('div', { style: 'font-size:14px;font-weight:600;margin-bottom:5px' }, q),
      h('div', { style: 'font-size:12.5px;color:var(--ap-ink2);line-height:1.65' }, a)));
  });
  return section('คำถามที่พบบ่อย', box);
}
