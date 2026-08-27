import { h, s } from './dom.js';
import { buildPyramid } from '../lib/pyramid.js';

const TIER_FILL = {
  solid: 'var(--ap-ok)',
  building: 'var(--ap-warn)',
  weak: 'var(--ap-bad)',
  info: 'var(--pyr-info)',
};
const DOT = { ok: 'var(--ap-ok)', gap: 'var(--ap-warn)', none: 'var(--ap-bad)', info: 'var(--ap-ink2)' };
const pct = (x) => (x == null ? '' : Math.round(x * 100) + '%');

/* pyramid geometry — apex + base corners, viewBox 0 0 440 250 */
const APEX_X = 258, APEX_Y = 14, BASE_Y = 238, BASE_HALF = 168;
const BANDS = [
  [166, BASE_Y], // tiers[0] — base
  [92, 160], // tiers[1] — middle
  [APEX_Y, 86], // tiers[2] — apex
];
const LABEL_Y = [206, 128, 58];

const edgeX = (y, side) => {
  const t = (y - APEX_Y) / (BASE_Y - APEX_Y); // 0 at apex → 1 at base
  return side === 'L' ? APEX_X - BASE_HALF * t : APEX_X + BASE_HALF * t;
};

/** @param {ReturnType<import('../lib/needs.js').analyze>} result */
export function renderPyramid(result) {
  const pyr = buildPyramid(result);
  const focus = pyr.currentTier;

  const svg = s('svg', { viewBox: '0 0 440 250', class: 'pyr-svg', role: 'img',
    'aria-label': 'ปิรามิดการเงิน — ' + pyr.headline });

  const defs = s('defs', {});
  svg.append(defs);

  pyr.tiers.forEach((t, i) => {
    const [yt, yb] = BANDS[i];
    const isApex = i === 2;
    const pts = isApex
      ? `${APEX_X},${APEX_Y} ${edgeX(yb, 'R')},${yb} ${edgeX(yb, 'L')},${yb}`
      : `${edgeX(yt, 'L')},${yt} ${edgeX(yt, 'R')},${yt} ${edgeX(yb, 'R')},${yb} ${edgeX(yb, 'L')},${yb}`;

    const g = s('g', { class: 'pyr-tier-g' + (i === focus ? ' is-focus' : '') });
    g.append(s('polygon', {
      points: pts,
      fill: TIER_FILL[t.status] || 'var(--pyr-info)',
      stroke: 'var(--ap-bg)', 'stroke-width': 3, 'stroke-linejoin': 'round',
    }));
    // top highlight strip for depth (not on apex / info)
    if (!isApex && !t.informational) {
      g.append(s('polygon', {
        points: `${edgeX(yt, 'L')},${yt} ${edgeX(yt, 'R')},${yt} ${edgeX(yt + 7, 'R')},${yt + 7} ${edgeX(yt + 7, 'L')},${yt + 7}`,
        fill: 'rgba(255,255,255,0.16)',
      }));
    }
    // focus ring
    if (i === focus) {
      g.append(s('polygon', {
        points: pts, fill: 'none',
        stroke: 'var(--ap-pri)', 'stroke-width': 2.5, 'stroke-linejoin': 'round',
      }));
    }

    const name = s('text', { x: APEX_X, y: LABEL_Y[i] - (t.coverage != null ? 6 : 0),
      'text-anchor': 'middle', class: 'pyr-name' + (t.informational ? ' info' : '') });
    name.textContent = t.title;
    g.append(name);
    if (t.coverage != null) {
      const p = s('text', { x: APEX_X, y: LABEL_Y[i] + 11, 'text-anchor': 'middle', class: 'pyr-pct-t' });
      p.textContent = pct(t.coverage);
      g.append(p);
    }
    svg.append(g);
  });

  // focus marker — pill in the left gutter + connector into the tier
  const fy = LABEL_Y[focus];
  const tierLeft = edgeX(fy, 'L');
  const marker = s('g', { class: 'pyr-marker' });
  marker.append(
    s('line', { x1: 66, y1: fy, x2: tierLeft - 3, y2: fy, stroke: 'var(--ap-pri)', 'stroke-width': 2 }),
    s('path', { d: `M${tierLeft - 3} ${fy} l-9 -5 v10 z`, fill: 'var(--ap-pri)' }),
    s('rect', { x: 4, y: fy - 12, width: 62, height: 24, rx: 12, fill: 'var(--ap-pri)' }),
    (() => { const t = s('text', { x: 35, y: fy + 4, 'text-anchor': 'middle', class: 'pyr-pill-t' }); t.textContent = 'เริ่มที่นี่'; return t; })()
  );
  svg.append(marker);

  const lists = h('div', { class: 'pyr-tiers' },
    ...pyr.tiers.map((t, i) =>
      h('div', { class: `pyr-tier st-${t.status}` + (i === focus ? ' is-focus' : '') },
        h('div', { class: 'pt-head' },
          h('strong', {}, t.title, i === focus ? h('span', { class: 'pt-focus-tag' }, 'โฟกัสตอนนี้') : null),
          t.coverage != null ? h('span', { class: 'pt-pct' }, pct(t.coverage)) : h('span', { class: 'pt-pct muted' }, 'ต่อยอด')),
        h('div', { class: 'pt-sub' }, t.subtitle),
        h('ul', {}, ...t.items.map((it) =>
          h('li', {},
            h('span', { class: 'pt-dot', style: `background:${DOT[it.status] || DOT.info}` }),
            it.label))))));

  return h('div', { class: 'section pyramid' },
    h('h2', {}, 'ปิรามิดการเงิน'),
    h('div', { class: 'section-hint' }, pyr.headline),
    h('div', { class: 'pyr-body' }, h('div', { class: 'pyr-svg-wrap' }, svg), lists));
}
