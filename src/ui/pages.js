import { h, s, icon, brand, BRAND } from './dom.js';
import { ringGauge } from './charts.js';

/* ---------------- Login (magic link) ---------------- */

export function renderLogin({ onSubmit, onBack } = {}) {
  const email = h('input', { class: 'input', type: 'email', placeholder: 'you@example.com', style: 'min-height:42px' });
  const msg = h('div', { class: 'auth-fine', style: 'color:var(--ap-ok)' });
  const card = h('div', { class: 'auth-card elev-md' },
    h('div', { class: 'auth-aside' },
      brand(22),
      h('div', { class: 'grow' }),
      h('h2', {}, 'สรุป Protection Gap', h('br'), 'ให้ลูกค้าเห็นภาพใน 5 วินาที'),
      h('p', {}, 'กรอกข้อมูลจากบทสนทนา ระบบสรุปเป็นอินโฟกราฟิกพร้อมพิมพ์ PDF และแชร์ลิงก์ให้ลูกค้าได้ทันที'),
      h('div', { class: 'rule' }),
      h('div', { class: 'fine' }, 'เครื่องมือสำหรับตัวแทนประกันชีวิต สุขภาพ สะสมทรัพย์ และยูนิตลิงก์')
    ),
    h('div', { class: 'auth-main' },
      h('h1', {}, 'เข้าสู่ระบบตัวแทน'),
      h('div', { class: 'lede' }, 'กรอกอีเมลที่ใช้งาน เราจะส่งลิงก์เข้าสู่ระบบไปให้ — ไม่ต้องจำรหัสผ่าน'),
      h('div', { class: 'field ap-f' }, h('label', {}, 'อีเมล'), email),
      h('button', { class: 'btn btn-primary ap-fill', style: 'justify-content:center;margin-top:14px;min-height:42px',
        onclick: async () => {
          if (!email.value.trim()) return;
          try { await onSubmit?.(email.value.trim()); msg.textContent = 'ส่งลิงก์เข้าสู่ระบบไปที่อีเมลแล้ว'; }
          catch (e) { msg.style.color = 'var(--ap-bad)'; msg.textContent = 'ส่งไม่สำเร็จ: ' + e.message; }
        } }, 'ส่งลิงก์เข้าสู่ระบบ'),
      msg,
      h('div', { class: 'auth-fine' }, 'ลิงก์ใช้ได้ 15 นาที · การเข้าใช้งานถือว่ายอมรับ ',
        h('a', { href: '#' }, 'ข้อกำหนดการใช้งาน'), ' และ ', h('a', { href: '#' }, 'นโยบายความเป็นส่วนตัว')),
      h('hr', { class: 'hr', style: 'margin:26px 0 0;max-width:340px' }),
      h('div', { style: 'font-size:12.5px;color:var(--ap-ink2);margin-top:16px' },
        'กลับไปหน้าเครื่องมือ? ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); onBack?.(); } }, 'เริ่มวิเคราะห์'))
    )
  );
  return card;
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

export function renderLanding({ onStart, onPreview, onLogin } = {}) {
  const wrap = h('div', { class: 'landing' },
    h('div', { class: 'landing-hero' },
      h('div', {},
        h('span', { class: 'tag p-info' }, 'สำหรับตัวแทนประกันชีวิต · สุขภาพ · สะสมทรัพย์ · ยูนิตลิงก์'),
        h('h1', {}, 'ลูกค้าเห็นช่องว่าง', h('br'), 'ก่อนที่คุณจะต้องอธิบาย'),
        h('p', {}, 'กรอกข้อมูลที่ได้จากการคุยกับลูกค้า ระบบสรุปเป็นอินโฟกราฟิก Protection Gap 6 ด้าน พร้อมประเภทประกันที่ควรพิจารณาและสิทธิลดหย่อนภาษีที่เหลือ — พิมพ์ PDF หรือส่งลิงก์ให้ลูกค้าได้ทันที'),
        h('div', { class: 'cta' },
          h('button', { class: 'btn btn-primary ap-fill', style: 'min-height:42px;padding:0 18px', onclick: () => onStart?.() }, 'เริ่มคัดกรองผู้มุ่งหวัง'),
          h('button', { class: 'btn btn-secondary', style: 'min-height:42px;padding:0 18px', onclick: () => onPreview?.() }, 'ดูตัวอย่างผลลัพธ์')),
        h('div', { class: 'fine' }, 'ไม่ต้องใส่บัตรเครดิต · ใช้บนมือถือและ iPad ได้ทันที')
      ),
      h('div', { class: 'hero-preview' },
        h('div', { class: 'cap' }, 'ตัวอย่างสรุป'),
        h('div', { style: 'display:flex;align-items:center;gap:14px;margin-top:12px' },
          ringGauge(12, 66),
          h('div', {}, h('div', { style: 'font-size:11.5px;color:rgba(234,238,245,.6)' }, 'ช่องว่างรวม'),
            h('div', { class: 'n', style: 'font-size:24px;font-weight:600;letter-spacing:-0.03em' }, '34,728,000'))),
        h('div', { style: 'display:flex;flex-direction:column;gap:8px;margin-top:18px' },
          ...SEV_PREVIEW.map(([label, pct, color]) =>
            h('div', { class: 'row' }, h('span', {}, label),
              h('div', { class: 'rtrack' }, h('div', { style: `width:${pct}%;height:100%;border-radius:4px;background:${color}` })))))
      )
    ),
    h('hr', { class: 'hr', style: 'margin:0' }),
    section('ปัญหาที่เครื่องมือนี้แก้', h('div', { class: 'cols-3' },
      probCard('ลูกค้าไม่เห็นช่องว่างของตัวเอง', 'พูดเป็นตัวเลขลอย ๆ ลูกค้าจับภาพไม่ได้ ต่างจากการเห็นแท่ง "มีอยู่ 1 ล้าน / ควรมี 14 ล้าน" ในหน้าเดียว'),
      probCard('ปิดการขายช้า ต้องนัดหลายรอบ', 'สรุปจบในนัดเดียว ลูกค้าได้ PDF กลับไปคุยกับคู่สมรสพร้อมชื่อและ LINE ของคุณติดอยู่'),
      probCard('ทำเอกสารเองกินเวลา', 'กรอกครั้งเดียวประมาณ 3 นาที ได้รายงานที่หน้าตาเหมือนกันทุกครั้ง'))),
    h('hr', { class: 'hr', style: 'margin:0' }),
    section('สิ่งที่ได้', h('div', { class: 'cols-2' },
      feat('M2.5 13.5V9m4 4.5V5.5m4 8V2.5m4 11V7', 'วิเคราะห์ 6 ด้าน', 'ชีวิต/คุ้มครองรายได้ · สุขภาพ · โรคร้ายแรง · อุบัติเหตุ/ทุพพลภาพ · เกษียณ · ทุนการศึกษาบุตร'),
      feat(['M5 6V2.5h6V6M4 6h8v5H4z', 'M5.5 11v2.5h5V11'], 'พิมพ์ PDF ได้สวย', 'จัดหน้า A4 ไว้แล้ว การ์ดไม่ขาดหน้า อ่านออกแม้พิมพ์ขาวดำ'),
      feat('M6.5 9.5a3 3 0 004.2 0l2-2a3 3 0 10-4.2-4.2l-.6.6M9.5 6.5a3 3 0 00-4.2 0l-2 2a3 3 0 104.2 4.2l.6-.6', 'แชร์ลิงก์ให้ลูกค้า', 'หน้าอ่านอย่างเดียว มีชื่อและ LINE ของคุณติดอยู่ท้ายจอตลอด'),
      feat('M2.5 3h11v10.5h-11zM2.5 6.5h11', 'สมุดลูกค้า', 'เก็บผลวิเคราะห์ทุกคนไว้ที่เดียว พร้อมเตือนต่ออายุทาง LINE — เร็ว ๆ นี้'))),
    faq(),
    h('div', { class: 'landing-foot' },
      h('div', { style: 'display:flex;align-items:flex-end;gap:26px;flex-wrap:wrap' },
        h('div', { style: 'flex:1' },
          h('h2', { style: 'font-size:22px' }, 'เริ่มจากลูกค้าคนถัดไปของคุณ'),
          h('div', { style: 'font-size:12.5px;color:rgba(234,238,245,.6);margin-top:7px' }, 'สมัครด้วยอีเมล ไม่ต้องตั้งรหัสผ่าน')),
        h('button', { class: 'btn btn-secondary', style: 'border-color:#4f9bff;color:#9dc6ff;min-height:42px;padding:0 20px', onclick: () => onLogin?.() }, 'เริ่มใช้ฟรี')),
      h('div', { style: 'height:1px;margin:26px 0 18px;background:linear-gradient(to right,transparent,rgba(234,238,245,.2) 48px,rgba(234,238,245,.2) calc(100% - 48px),transparent)' }),
      h('div', { style: 'display:flex;gap:20px;align-items:center;font-size:11.5px;color:rgba(234,238,245,.5);flex-wrap:wrap' },
        h('span', { style: 'font-weight:600;color:rgba(234,238,245,.8)' }, BRAND),
        h('span', {}, 'ข้อกำหนดการใช้งาน'), h('span', {}, 'นโยบายความเป็นส่วนตัว (PDPA)'), h('span', {}, 'ติดต่อ'),
        h('span', { style: 'margin-left:auto' }, 'เครื่องมือช่วยวางแผน ไม่ใช่การเสนอขายผลิตภัณฑ์ประกันภัย'))
    )
  );
  return wrap;
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
    h('div', { class: 'ico' }, icon(d, { size: 16, stroke: '#1f6feb' })),
    h('div', {}, h('div', { class: 'ft' }, t), h('div', { class: 'fd' }, dsc)));
}
function faq() {
  const items = [
    ['เครื่องมือนี้แนะนำแบบประกันของบริษัทไหน', 'ไม่แนะนำแบบประกันหรือบริษัทใดเลย ระบบสรุปเฉพาะประเภทความคุ้มครองที่ควรพิจารณา การเลือกแบบและบริษัทเป็นบทบาทของตัวแทน'],
    ['ตัวเลขที่ได้เป็นการรับประกันผลประโยชน์หรือไม่', 'ไม่ใช่ ทุกหน้าผลมีข้อความกำกับชัดเจนว่าเป็นการประมาณการเพื่อประกอบการวางแผน ไม่ใช่ตารางผลประโยชน์ของบริษัทประกัน'],
    ['ข้อมูลลูกค้าเก็บอย่างไร', 'ตัวแทนต้องได้รับความยินยอมจากลูกค้าก่อนบันทึกข้อมูลตามหลัก PDPA หน้าแชร์แสดงเฉพาะข้อมูลที่จำเป็น และลบผลวิเคราะห์ได้ตลอดเวลา'],
    ['ใช้บน iPad ระหว่างนัดลูกค้าได้ไหม', 'ออกแบบมาให้ใช้บน iPad และมือถือเป็นหลัก ฟอร์มแบ่งเป็น 4 ขั้นกรอกเร็ว'],
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
