import { h, icon, ICONS, SUPPORT } from './dom.js';
import { scoreColor } from './charts.js';

const g = (v) => (Number.isFinite(v) ? Math.round(v).toLocaleString('th-TH') : '-');
const THMONTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const thDate = (iso) => { const d = new Date(iso); return `${d.getDate()} ${THMONTH[d.getMonth()]} ${d.getFullYear() + 543}`; };
const maritalLabel = (s) => ({ single: 'โสด', married: 'สมรส', divorced: 'หย่า', widowed: 'หม้าย', single_parent: 'เลี้ยงบุตรคนเดียว' }[s] || '');

/**
 * @param {{analyses:any[], stats:object, agent:object, onNew, onOpen:(id)=>void, onDelete:(id)=>Promise, onSaveProfile:(fields)=>Promise}} opts
 */
export function renderDashboard(opts = {}) {
  const agent = opts.agent || {};
  let analyses = opts.analyses || [];
  const listWrap = h('div', { class: 'dash-list' });
  const search = h('input', { class: 'input', placeholder: 'ค้นหาชื่อลูกค้า', style: 'width:220px',
    oninput: () => renderRows() });

  function renderRows() {
    const q = search.value.trim().toLowerCase();
    const rows = analyses.filter((a) => !q || (a.client_name || '').toLowerCase().includes(q));
    listWrap.innerHTML = '';
    if (!rows.length) {
      listWrap.append(h('div', { class: 'dash-empty' }, analyses.length ? 'ไม่พบลูกค้าที่ค้นหา' : 'ยังไม่มีผลวิเคราะห์ที่บันทึกไว้ — กด "วิเคราะห์ใหม่" เพื่อเริ่ม'));
      return;
    }
    listWrap.append(h('div', { class: 'dash-row dash-head' },
      h('span', {}, 'ลูกค้า'), h('span', { class: 'r' }, 'อายุ'), h('span', { class: 'r' }, 'คะแนน'), h('span', { class: 'r' }, 'อัปเดต'), h('span', {})));
    rows.forEach((a) => {
      const score = Number(a.summary?.overallScore);
      listWrap.append(h('div', { class: 'dash-row' },
        h('div', { class: 'dr-name', onclick: () => opts.onOpen?.(a.id) },
          h('div', { class: 'nm' }, a.client_name || '(ไม่ระบุชื่อ)'),
          h('div', { class: 'sub' }, [maritalLabel(a.marital_status), a.summary?.overallLevel].filter(Boolean).join(' · '))),
        h('span', { class: 'r n muted' }, a.client_age ?? '-'),
        h('div', { class: 'r score' },
          h('div', { class: 'sbar' }, h('div', { style: `width:${Math.max(4, Math.min(100, score || 0))}%;background:${scoreColor(score || 0)}` })),
          h('span', { class: 'n' }, Number.isFinite(score) ? score : '-')),
        h('span', { class: 'r muted date' }, a.created_at ? thDate(a.created_at) : '-'),
        h('div', { class: 'dr-actions' },
          h('button', { class: 'icon-btn', title: 'เปิด', onclick: () => opts.onOpen?.(a.id) }, icon(ICONS.chevron, { size: 14, stroke: 'var(--ap-ink2)' })),
          h('button', { class: 'icon-btn', title: 'ลบ', onclick: async () => {
            if (!confirm(`ลบผลวิเคราะห์ของ "${a.client_name || 'ลูกค้า'}"?\nการลบเป็นการถาวร`)) return;
            try { await opts.onDelete?.(a.id); analyses = analyses.filter((x) => x.id !== a.id); renderRows(); }
            catch (e) { alert('ลบไม่สำเร็จ: ' + e.message); }
          } }, icon('M4 8h8', { size: 14, stroke: 'var(--ap-bad)' })))));
    });
  }
  renderRows();

  /* profile card */
  const pf = {
    display_name: h('input', { class: 'input', value: agent.display_name || '', placeholder: 'ชื่อ-นามสกุล' }),
    line_id: h('input', { class: 'input', value: agent.line_id || '', placeholder: '@yourline' }),
    company: h('input', { class: 'input', value: agent.company || '', placeholder: 'บริษัท (ถ้ามี)' }),
    license_no: h('input', { class: 'input', value: agent.license_no || '', placeholder: 'เลขที่ใบอนุญาตตัวแทน' }),
  };
  const pfMsg = h('div', { class: 'auth-fine' });
  const pfBtn = h('button', { class: 'btn btn-primary ap-fill', style: 'justify-content:center;width:100%',
    onclick: async () => {
      pfBtn.disabled = true; pfMsg.textContent = '';
      try {
        await opts.onSaveProfile?.({ display_name: pf.display_name.value.trim(), line_id: pf.line_id.value.trim(), company: pf.company.value.trim(), license_no: pf.license_no.value.trim() });
        pfMsg.style.color = 'var(--ap-ok)'; pfMsg.textContent = 'บันทึกแล้ว';
      } catch (e) { pfMsg.style.color = 'var(--ap-bad)'; pfMsg.textContent = 'บันทึกไม่สำเร็จ: ' + e.message; }
      pfBtn.disabled = false;
    } }, 'บันทึกโปรไฟล์');

  return h('div', { class: 'dashboard' },
    h('div', { class: 'dash-grid' },
      h('div', {},
        h('div', { class: 'dash-topbar' },
          h('div', {},
            h('h1', {}, 'ผลวิเคราะห์ที่บันทึกไว้'),
            h('div', { class: 'muted', style: 'font-size:12.5px;margin-top:3px' }, `ทั้งหมด ${analyses.length} รายการ`)),
          h('div', { style: 'flex:1' }),
          search,
          h('button', { class: 'btn btn-primary ap-fill', onclick: () => opts.onNew?.() }, icon(ICONS.plus, { size: 13, width: 1.7 }), 'วิเคราะห์ใหม่')),
        h('div', { class: 'dash-card' }, listWrap)),
      h('div', { class: 'dash-side' },
        h('div', { class: 'card ap-g elev-sm', style: 'gap:0' },
          h('div', { class: 'side-kicker' }, 'เดือนนี้'),
          h('hr', { class: 'hr', style: 'margin:9px -17px' }),
          kv('วิเคราะห์ใหม่', opts.stats?.created ?? 0),
          kv('คะแนนเฉลี่ยลูกค้า', opts.stats?.avgScore ?? '-')),
        h('div', { class: 'card ap-g elev-sm' },
          h('div', { style: 'font-size:13.5px;font-weight:600' }, 'สมุดลูกค้า'),
          h('div', { class: 'muted', style: 'font-size:12px;line-height:1.6' }, 'เก็บกรมธรรม์ที่ลูกค้าถืออยู่ + ข้อยกเว้น และดูรายการที่ใกล้ครบกำหนดชำระ'),
          h('a', { class: 'btn btn-secondary', href: '?view=clients', style: 'justify-content:center;margin-top:2px',
            onclick: (e) => { e.preventDefault(); opts.onClients?.(); } }, 'เปิดสมุดลูกค้า')),
        SUPPORT.enabled
          ? h('div', { class: 'card ap-g elev-sm support-card' },
              h('div', { style: 'font-size:13.5px;font-weight:600' }, '☕ โปรเจคนี้ทำคนเดียว ฟรี'),
              h('div', { class: 'muted', style: 'font-size:12px;line-height:1.6' }, 'ถ้าช่วยให้คุณทำงานง่ายขึ้น สนับสนุนค่ากาแฟกันได้ ไม่บังคับ'),
              h('a', { class: 'btn btn-secondary', href: '?view=support', style: 'justify-content:center;margin-top:2px',
                onclick: (e) => { e.preventDefault(); opts.onSupport?.(); } }, 'สนับสนุนโปรเจค'))
          : null,
        h('div', { class: 'card ap-g elev-sm' },
          h('div', { style: 'font-size:13.5px;font-weight:600' }, 'โปรไฟล์ตัวแทน'),
          h('div', { class: 'muted', style: 'font-size:11.5px;margin-bottom:4px' }, 'ชื่อ · LINE · เลขใบอนุญาต แสดงบนหัวรายงานและหน้าแชร์ (ไม่แสดงชื่อบริษัทประกันบนเอกสารลูกค้า)'),
          pfField('ชื่อ-นามสกุล', pf.display_name),
          pfField('LINE ID', pf.line_id),
          pfField('บริษัทต้นสังกัด (สำหรับบันทึกของคุณเอง)', pf.company),
          pfField('เลขที่ใบอนุญาตตัวแทน', pf.license_no),
          pfBtn, pfMsg,
          opts.onDeleteAccount
            ? h('div', { style: 'margin-top:14px;padding-top:12px;border-top:1px solid var(--ap-line)' },
                h('a', { href: '#', style: 'font-size:12px;color:var(--ap-bad)', onclick: async (e) => {
                  e.preventDefault();
                  if (!confirm('ปิดบัญชีถาวร?\n\nระบบจะลบบัญชีนี้และผลวิเคราะห์ลูกค้าทั้งหมดของคุณ ลิงก์แชร์ทุกลิงก์จะหยุดทำงานทันที การกระทำนี้ย้อนกลับไม่ได้')) return;
                  try { await opts.onDeleteAccount(); }
                  catch (err) { alert('ปิดบัญชีไม่สำเร็จ: ' + err.message); }
                } }, 'ปิดบัญชีและลบข้อมูลทั้งหมด'))
            : null))));
}

function pfField(label, input) {
  return h('div', { class: 'field ap-f', style: 'margin-bottom:8px' }, h('label', {}, label), input);
}
function kv(k, v) {
  return h('div', { class: 'kv' }, h('span', {}, k), h('b', { class: 'n' }, v));
}
