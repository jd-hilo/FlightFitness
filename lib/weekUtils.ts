function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

/** Day index 0–6 within the plan week (weekStart = Monday). */
export function planDayIndexForToday(weekStartYmd: string): number {
  const start = parseYmd(weekStartYmd);
  start.setHours(12, 0, 0, 0);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diff = Math.round((today.getTime() - start.getTime()) / 86400000);
  if (diff < 0) return 0;
  if (diff > 6) return 6;
  return diff;
}

export const WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export function weekDatesFromStart(weekStartYmd: string): Date[] {
  const start = parseYmd(weekStartYmd);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function dateKeyForPlanDay(weekStartYmd: string, dayIndex: number): string {
  const dates = weekDatesFromStart(weekStartYmd);
  return dates[dayIndex]!.toISOString().slice(0, 10);
}
