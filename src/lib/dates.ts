/** Date helpers for the week plan. Dates are plain "YYYY-MM-DD" strings (no time zones). */

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromIsoDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Monday of the week that contains `d`. */
export function weekStart(d: Date): string {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (copy.getDay() + 6) % 7; // Monday = 0
  copy.setDate(copy.getDate() - offset);
  return toIsoDate(copy);
}

export function addDays(iso: string, days: number): string {
  const d = fromIsoDate(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

/** The seven dates (Mon–Sun) of the week starting at `start`. */
export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Today's date ("YYYY-MM-DD") in the given time zone (servers run on UTC). */
export function todayIso(timeZone = 'Europe/Berlin', now = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  } catch {
    return toIsoDate(now);
  }
}

export function isIsoDate(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return toIsoDate(fromIsoDate(s)) === s;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "2026-11-23" → { day: "Monday", short: "Mon", date: "23 Nov" } */
export function dayLabel(iso: string): { day: string; short: string; date: string } {
  const d = fromIsoDate(iso);
  const day = DAYS[d.getDay()];
  return { day, short: day.slice(0, 3), date: `${d.getDate()} ${MONTHS[d.getMonth()]}` };
}

/** "23 – 29 November", or "30 November – 6 December" across months */
export function weekLabel(start: string): string {
  const a = fromIsoDate(start);
  const b = fromIsoDate(addDays(start, 6));
  if (a.getMonth() === b.getMonth()) return `${a.getDate()} – ${b.getDate()} ${MONTHS_LONG[b.getMonth()]}`;
  return `${a.getDate()} ${MONTHS_LONG[a.getMonth()]} – ${b.getDate()} ${MONTHS_LONG[b.getMonth()]}`;
}

/** Select options for `count` days starting at `start`: { value: "2026-11-23", label: "Mon 23 Nov" } */
export function dayOptions(start: string, count = 14): Array<{ value: string; label: string }> {
  return Array.from({ length: count }, (_, i) => {
    const value = addDays(start, i);
    const l = dayLabel(value);
    return { value, label: `${l.short} ${l.date}` };
  });
}
