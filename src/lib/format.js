/** ฟอร์แมตตัวเลข/สกุลเงินแบบไทย */

export function baht(n, { round = 1000 } = {}) {
  if (n == null || Number.isNaN(n)) return '-';
  const v = round ? Math.round(n / round) * round : Math.round(n);
  return v.toLocaleString('th-TH', { maximumFractionDigits: 0 }) + ' บาท';
}

export function bahtShort(n) {
  if (n == null || Number.isNaN(n)) return '-';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return trim(n / 1_000_000) + ' ลบ.';
  if (abs >= 1_000) return trim(n / 1_000) + ' พัน';
  return Math.round(n).toLocaleString('th-TH');
}

function trim(x) {
  return Number(x.toFixed(x < 10 ? 2 : 1)).toLocaleString('th-TH');
}

export function pct(x, digits = 0) {
  if (x == null || Number.isNaN(x)) return '-';
  return (x * 100).toFixed(digits) + '%';
}

export function num(n) {
  if (n === '' || n == null) return null;
  const cleaned = String(n).replace(/[, ]/g, '');
  const v = Number(cleaned);
  return Number.isFinite(v) ? v : null;
}
