// Date helpers. Dates are plain "YYYY-MM-DD" strings in the user's local time,
// so there are no time-zone surprises when comparing days.

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toISODate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isValidISO(s) {
  if (typeof s !== 'string') return false;
  const match = ISO.exec(s);
  if (!match) return false;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

export function dayNumber(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

/** Whole days from a to b (positive when b is later). */
export function daysBetween(a, b) {
  return dayNumber(b) - dayNumber(a);
}

export function addDays(iso, n) {
  const t = new Date((dayNumber(iso) + n) * 86400000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

export function maxDate(...dates) {
  return dates.filter(Boolean).reduce((a, b) => (a >= b ? a : b));
}

/** Monday of the week containing iso (weeks run Monday to Sunday). */
export function startOfWeek(iso) {
  const dow = (dayNumber(iso) + 3) % 7; // 1970-01-01 was a Thursday; Monday = 0
  return addDays(iso, -dow);
}

export function formatDate(iso, locale) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' })
    .format(new Date(y, m - 1, d, 12));
}

export function describeAgo(days) {
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}
