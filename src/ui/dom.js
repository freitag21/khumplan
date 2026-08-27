/** DOM helpers + shared brand bits */

export const BRAND = 'AgentPlan'; // ชื่อชั่วคราว — เปลี่ยนที่เดียวจบ

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

/** AgentPlan mark — rounded square + roof/house line */
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
