/** DOM helpers + shared brand bits */

export const BRAND = 'KhumPlan'; // คุ้มแพลน — เปลี่ยนชื่อแบรนด์ที่เดียวจบ

/**
 * ช่องทางสนับสนุนโปรเจค — เติมค่าจริงตรงนี้ ส่วนไหนเว้นว่างจะถูกซ่อนอัตโนมัติ
 * ปิดทั้งหมดได้ด้วย enabled: false
 */
export const SUPPORT = {
  enabled: true,
  qrImage: '/support-qr.jpg', // พร้อมเพย์ (ใช้ QR เดียวกับ ChanSpace — เปลี่ยนไฟล์ใน public/ ได้)
  qrCaption: 'สแกนพร้อมเพย์ — เลี้ยงกาแฟกันได้เลย',
  links: [
    // { label: 'Ko-fi', url: 'https://ko-fi.com/xxxx' },
  ],
};
export const hasSupport = () =>
  SUPPORT.enabled && (SUPPORT.qrImage || (SUPPORT.links && SUPPORT.links.length));

/** true = เชื่อม custom SMTP (Resend) ใน Supabase แล้ว → เปิดฟีเจอร์ "ลืมรหัสผ่าน" / ยืนยันอีเมล */
export const EMAIL_ENABLED = true;

/**
 * ช่องทางติดต่อ — แก้ค่าตรงนี้ที่เดียว ช่องไหนเว้นว่าง (null) จะถูกซ่อน
 */
export const CONTACT = {
  email: 'support@khumplan.com', // Cloudflare Email Routing → forward เข้ากล่องจริง

  lineId: null,       // เช่น '@khumplan' — เว้นว่างไว้จนกว่าจะเปิด LINE OA
  lineUrl: null,      // เช่น 'https://lin.ee/xxxxxxx'
  facebookUrl: null,  // เช่น 'https://facebook.com/khumplan'
  responseNote: 'คุ้มแพลนทำโดยตัวแทนคนเดียว ตอบกลับปกติภายใน 1–3 วันทำการ',
};

/** hyperscript: h('div', {class:'x', onclick:fn}, child, [children]) */
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

const SVGNS = 'http://www.w3.org/2000/svg';
/** svg helper — s('path', {d:'...'}) */
export function s(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null) continue;
    el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}

/** KhumPlan mark — rounded square + roof/house line */
export function logoMark(size = 22) {
  const svg = s('svg', { width: size, height: size, viewBox: '0 0 26 26' });
  svg.append(
    s('rect', { width: 26, height: 26, rx: 7, fill: '#1f6feb' }),
    s('path', { d: 'M8 17.5V11l5-3.5 5 3.5v6.5', fill: 'none', stroke: '#fff', 'stroke-width': 1.7, 'stroke-linejoin': 'round' }),
    s('path', { d: 'M13 17.5v-4', stroke: '#fff', 'stroke-width': 1.7 })
  );
  return svg;
}

/** small stroked icon from a path string */
export function icon(d, { size = 14, stroke = 'currentColor', width = 1.6, fill = 'none' } = {}) {
  const svg = s('svg', { width: size, height: size, viewBox: '0 0 16 16', fill });
  const paths = Array.isArray(d) ? d : [d];
  for (const p of paths) svg.append(s('path', { d: p, stroke, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  return svg;
}

export const ICONS = {
  back: 'M10 3L5 8l5 5',
  chevron: 'M6 3.5L10.5 8 6 12.5',
  plus: 'M8 3v10M3 8h10',
  minus: 'M4 8h8',
  print: ['M5 6V2.5h6V6M4 6h8v5H4z', 'M5.5 11v2.5h5V11'],
  info: null,
};

/** brand block for the top bar */
export function brand(size = 22) {
  return h('div', { class: 'brand' }, logoMark(size), h('span', { class: 'brand-name' }, BRAND));
}

/* ---------------- theme ---------------- */

const THEME_KEY = 'khumplan-theme';
const prefersDark = () => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

export function currentTheme() {
  const set = document.documentElement.dataset.theme;
  if (set === 'dark' || set === 'light') return set;
  return prefersDark() ? 'dark' : 'light';
}

export function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  return next;
}

/** ปุ่มสลับโหมดสว่าง/มืด สำหรับ topbar */
export function themeToggle() {
  const btn = h('button', { class: 'theme-toggle', title: 'สลับโหมดสว่าง / มืด', 'aria-label': 'สลับโหมด' });
  const paint = () => {
    const dark = currentTheme() === 'dark';
    btn.innerHTML = '';
    btn.append(dark ? sunIcon() : moonIcon());
  };
  btn.addEventListener('click', () => { toggleTheme(); paint(); });
  paint();
  return btn;
}

function moonIcon() {
  return s('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5 },
    s('path', { d: 'M13 9.5A5.5 5.5 0 016.5 3 5.5 5.5 0 1013 9.5z', 'stroke-linejoin': 'round' }));
}
function sunIcon() {
  const svg = s('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5 });
  svg.append(s('circle', { cx: 8, cy: 8, r: 3 }));
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const x1 = 8 + Math.cos(a) * 5, y1 = 8 + Math.sin(a) * 5;
    const x2 = 8 + Math.cos(a) * 6.8, y2 = 8 + Math.sin(a) * 6.8;
    svg.append(s('line', { x1, y1, x2, y2, 'stroke-linecap': 'round' }));
  }
  return svg;
}
