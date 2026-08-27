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

// polygon points for the 3 stacked shapes (viewBox 0 0 360 236) — index 0 = wide base, 2 = apex
const SHAPES = [
  '82,154 278,154 320,232 40,232', // base
  '120,80 240,80 274,148 86,148', // middle
  '180,8 236,74 124,74', // apex
];
const LABEL_Y = [198, 118, 60];

/** @param {ReturnType<import('../lib/needs.js').analyze>} result */
export function renderPyramid(result) {
  const pyr = buildPyramid(result);

  const svg = s('svg', { viewBox: '0 0 360 236', class: 'pyr-svg', role: 'img' });
  pyr.tiers.forEach((t, i) => {
    svg.append(s('polygon', {
      points: SHAPES[i],
      fill: TIER_FILL[t.status] || 'var(--pyr-info)',
      stroke: 'var(--ap-card)', 'stroke-width': 2,
    }));
    const label = s('text', { x: 180, y: LABEL_Y[i], 'text-anchor': 'middle', class: 'pyr-label' + (t.informational ? ' info' : '') });
    label.textContent = t.title;
    svg.append(label);
    if (t.coverage != null) {
      const sub = s('text', { x: 180, y: LABEL_Y[i] + 15, 'text-anchor': 'middle', class: 'pyr-label-sub' });
      sub.textContent = pct(t.coverage);
      svg.append(sub);
    }
  });
  // "คุณอยู่ตรงนี้" marker
  const my = LABEL_Y[pyr.currentTier] - 6;
  svg.append(
    s('path', { d: `M8 ${my} l16 -7 v14 z`, fill: 'var(--ap-pri)' }),
    (() => { const t = s('text', { x: 28, y: my + 4, class: 'pyr-here' }); t.textContent = 'คุณอยู่ตรงนี้'; return t; })()
  );

  const lists = h('div', { class: 'pyr-tiers' },
    ...pyr.tiers.map((t) =>
      h('div', { class: `pyr-tier st-${t.status}` },
        h('div', { class: 'pt-head' },
          h('strong', {}, t.title),
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
