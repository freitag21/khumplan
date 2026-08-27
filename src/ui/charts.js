/** SVG/DOM chart bits for the Nocturne result page (no dependencies) */
import { h, s } from './dom.js';

const ARC_R = 100;
const ARC_LEN = Math.PI * ARC_R; // half-circle path length ≈ 314.16

export function severityColor(sev) {
  if (sev >= 90) return 'var(--ap-bad)';
  if (sev >= 40) return 'var(--ap-warn)';
  if (sev > 0) return 'var(--ap-info)';
  return 'var(--ap-ok)';
}
export function scoreColor(score) {
  if (score >= 66) return 'var(--ap-ok)';
  if (score >= 33) return 'var(--ap-warn)';
  return 'var(--ap-bad)';
}

/** half-circle gauge for the dark summary band; score 0–100 */
export function scoreGauge(score, { width = 196 } = {}) {
  const clamped = Math.max(0, Math.min(100, score));
  const fill = (ARC_LEN * clamped) / 100;
  const svg = s('svg', { viewBox: '0 0 240 142', style: `width:${width}px;height:auto;display:block` });
  const path = 'M20,120 A100,100 0 0 1 220,120';
  svg.append(
    s('path', { d: path, fill: 'none', stroke: 'rgba(234,238,245,.15)', 'stroke-width': 15, 'stroke-linecap': 'round' }),
    s('path', {
      d: path, fill: 'none', stroke: scoreColor(score), 'stroke-width': 15, 'stroke-linecap': 'round',
      'stroke-dasharray': `${fill.toFixed(1)} ${(ARC_LEN + 20).toFixed(0)}`,
    }),
    s('text', { x: 120, y: 110, 'text-anchor': 'middle', fill: '#ffffff', style: 'font:600 48px Inter,sans-serif;letter-spacing:-0.03em' }, String(Math.round(score))),
    s('text', { x: 120, y: 133, 'text-anchor': 'middle', fill: 'rgba(234,238,245,.55)', style: 'font:500 12px Inter,sans-serif' }, '/ 100')
  );
  return svg;
}

/** small ring gauge (landing / dashboard); returns an <svg> */
export function ringGauge(score, size = 66) {
  const r = 31;
  const c = 2 * Math.PI * r;
  const fill = (c * Math.max(0, Math.min(100, score))) / 100;
  const cx = size === 66 ? 39 : 39;
  const svg = s('svg', { width: size, height: size, viewBox: '0 0 78 78', style: 'flex:none' });
  svg.append(
    s('circle', { cx, cy: 39, r, fill: 'none', stroke: 'rgba(234,238,245,.16)', 'stroke-width': 8 }),
    s('circle', {
      cx, cy: 39, r, fill: 'none', stroke: scoreColor(score), 'stroke-width': 8, 'stroke-linecap': 'round',
      'stroke-dasharray': `${fill.toFixed(1)} ${c.toFixed(0)}`, transform: `rotate(-90 ${cx} 39)`,
    }),
    s('text', { x: cx, y: 46, 'text-anchor': 'middle', fill: '#fff', style: 'font:600 23px Inter,sans-serif' }, String(Math.round(score)))
  );
  return svg;
}

/** one severity row: label | track | value */
export function sevRow(label, severity, ok) {
  const pct = Math.max(3, Math.min(100, severity));
  return h('div', { class: 'sev-row' },
    h('div', { class: 'lbl' }, label),
    h('div', { class: 'sev-track' },
      h('div', { class: 'sev-fill', style: `width:${pct}%;background:${ok ? 'var(--ap-ok)' : severityColor(severity)}` })),
    h('div', { class: 'val n' }, ok ? 'พอ' : String(Math.round(severity)))
  );
}

/** "มีอยู่ / ควรมี" mini comparison bars for a category card */
export function miniBars(have, need) {
  const havePct = need > 0 ? Math.max(0, Math.min(100, (have / need) * 100)) : 0;
  const mk = (label, cls, pct, show) =>
    h('div', { class: 'mini-row' },
      h('span', {}, label),
      h('div', { class: 'mini-track' }, show ? h('div', { class: `mini-fill ${cls}`, style: `width:${pct}%` }) : null));
  return h('div', { class: 'mini-bars' },
    mk('มีอยู่', 'have', havePct, have > 0),
    mk('ควรมี', 'need', 100, need > 0)
  );
}
