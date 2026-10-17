import { normalizeDay, type DayCompletion } from '@/stores/completionStore';
type DayFaith = {
  verseRead: boolean;
  studyRead: boolean;
  journalDone: boolean;
  journalLine: string;
};
import {
  formatYmdLocal,
  mealDayIndexForViewStrip,
  mondayOfWeekContainingLocal,
} from '@/lib/weekUtils';

export type DayHabitScores = {
  dateKey: string;
  train: number;
  faith: number;
};

function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y!, m! - 1, d!, 12, 0, 0, 0);
}

/** Last `count` calendar days ending today (local), oldest first. */
export function lastCalendarDayKeys(count: number): string[] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    keys.push(formatYmdLocal(d));
  }
  return keys;
}

function stripIndexForDateKey(viewWeekStartYmd: string, dateKey: string): number {
  const start = parseYmd(viewWeekStartYmd);
  const day = parseYmd(dateKey);
  return Math.round((day.getTime() - start.getTime()) / 86400000);
}

function trainScore(day: DayCompletion, plannedExerciseCount: number): number {
  if (day.workoutDone) return 1;
  if (plannedExerciseCount > 0) {
    return Math.min(1, day.exerciseIdsDone.length / plannedExerciseCount);
  }
  return day.exerciseIdsDone.length > 0 ? 0.5 : 0;
}

function faithScore(day: DayFaith): number {
  let n = 0;
  if (day.studyRead) n++;
  if (day.journalDone) n++;
  return n / 2;
}

const emptyFaith = (): DayFaith => ({
  verseRead: false,
  studyRead: false,
  journalDone: false,
  journalLine: '',
});

export function buildLast7DayHabitScores(input: {
  completionByDay: Record<string, DayCompletion | undefined>;
  faithByDay: Record<string, DayFaith | undefined>;
  planWeekStart: string | null;
  workoutsByDay: ({ exercises: { id: string }[] } | null)[] | null;
}): DayHabitScores[] {
  const keys = lastCalendarDayKeys(7);

  return keys.map((dateKey) => {
    const completion = normalizeDay(input.completionByDay[dateKey]);
    const faith = input.faithByDay[dateKey] ?? emptyFaith();

    let plannedExercises = 0;

    if (input.planWeekStart && input.workoutsByDay) {
      const viewWeekYmd = formatYmdLocal(
        mondayOfWeekContainingLocal(parseYmd(dateKey))
      );
      const stripIdx = stripIndexForDateKey(viewWeekYmd, dateKey);
      const planIdx = mealDayIndexForViewStrip(
        input.planWeekStart,
        viewWeekYmd,
        stripIdx
      );
      if (planIdx != null) {
        plannedExercises =
          input.workoutsByDay[planIdx]?.exercises?.length ?? 0;
      }
    }

    return {
      dateKey,
      train: trainScore(completion, plannedExercises),
      faith: faithScore(faith),
    };
  });
}

/** Total workout session minutes per day for the last 7 calendar days. */
export function buildLast7DaySessionMinutes(
  sessions: { dateKey: string; durationSec: number }[]
): { dateKey: string; minutes: number }[] {
  const keys = lastCalendarDayKeys(7);
  const byDate = new Map<string, number>();
  for (const s of sessions) {
    const prev = byDate.get(s.dateKey) ?? 0;
    byDate.set(s.dateKey, prev + s.durationSec / 60);
  }
  return keys.map((dateKey) => ({
    dateKey,
    minutes: Math.round(byDate.get(dateKey) ?? 0),
  }));
}
