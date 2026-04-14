/** Parse YYYY-MM-DD as a local calendar day (noon avoids DST edge cases). */
function parseYmdLocal(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  if (y == null || m == null || d == null || Number.isNaN(y + m + d)) {
    return new Date();
  }
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/** Local calendar date string; use instead of toISOString().slice(0,10) (UTC). */
export function formatYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/** Short weekday label matching the device calendar (e.g. MON, TUE). */
export function weekdayAbbrevUpper(d: Date): string {
  return d
    .toLocaleDateString('en-US', { weekday: 'short' })
    .replace(/\./g, '')
    .toUpperCase();
}

/** Day index 0–6 within the plan week (index 0 = weekStart calendar day). */
export function planDayIndexForToday(weekStartYmd: string): number {
  const start = parseYmdLocal(weekStartYmd);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diff = Math.round((today.getTime() - start.getTime()) / 86400000);
  if (diff < 0) return 0;
  if (diff > 6) return 6;
  return diff;
}

/** @deprecated Prefer weekdayAbbrevUpper(weekDatesFromStart(...)[i]) for labels. */
export const WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export function weekDatesFromStart(weekStartYmd: string): Date[] {
  const start = parseYmdLocal(weekStartYmd);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function dateKeyForPlanDay(weekStartYmd: string, dayIndex: number): string {
  const dates = weekDatesFromStart(weekStartYmd);
  return formatYmdLocal(dates[dayIndex]!);
}

/** Monday (local) of the calendar week that contains `date` (ISO weekday: Mon=0..Sun=6 strip order). */
export function mondayOfWeekContainingLocal(d: Date): Date {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1);
  x.setDate(diff);
  return x;
}

/** YYYY-MM-DD for the Monday of the week containing **today** (device local). */
export function viewWeekStartYmdLocal(): string {
  return formatYmdLocal(mondayOfWeekContainingLocal(new Date()));
}

/** Whole-day offset from plan week Monday to view week Monday (view − plan). */
export function dayOffsetViewWeekFromPlanWeek(
  planWeekStartYmd: string,
  viewWeekStartYmd: string
): number {
  const p = parseYmdLocal(planWeekStartYmd);
  const v = parseYmdLocal(viewWeekStartYmd);
  p.setHours(12, 0, 0, 0);
  v.setHours(12, 0, 0, 0);
  return Math.round((v.getTime() - p.getTime()) / 86400000);
}

/**
 * Strip index 0–6 = Mon–Sun of the **view** week (usually this week).
 * Returns `mealsByDay` index, or null if that calendar day is outside the 7-day plan.
 */
export function mealDayIndexForViewStrip(
  planWeekStartYmd: string,
  viewWeekStartYmd: string,
  stripIndex: number
): number | null {
  const delta = dayOffsetViewWeekFromPlanWeek(planWeekStartYmd, viewWeekStartYmd);
  const j = stripIndex + delta;
  if (j < 0 || j > 6) return null;
  return j;
}

/** Calendar date key for a strip slot in the view week. */
export function dateKeyForViewStripDay(viewWeekStartYmd: string, stripIndex: number): string {
  const start = parseYmdLocal(viewWeekStartYmd);
  const d = new Date(start);
  d.setDate(start.getDate() + stripIndex);
  return formatYmdLocal(d);
}

/** Strip index 0–6 for **today** relative to view week Monday. */
export function viewStripIndexForToday(viewWeekStartYmd: string): number {
  const viewMon = parseYmdLocal(viewWeekStartYmd);
  const today = new Date();
  viewMon.setHours(12, 0, 0, 0);
  today.setHours(12, 0, 0, 0);
  const diff = Math.round((today.getTime() - viewMon.getTime()) / 86400000);
  if (diff < 0) return 0;
  if (diff > 6) return 6;
  return diff;
}

/** True when the selected strip day (Mon=0…Sun=6) is **before** today in the same view week. */
export function isViewStripDayBeforeToday(
  viewWeekStartYmd: string,
  stripIndex: number
): boolean {
  return stripIndex < viewStripIndexForToday(viewWeekStartYmd);
}
