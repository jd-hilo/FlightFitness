import { formatYmdLocal, mondayOfWeekContainingLocal, parseYmdLocal } from '@/lib/weekUtils';

export type ProgressRange = 'week' | 'month' | 'year' | 'all';

export const PROGRESS_RANGES: { key: ProgressRange; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
  { key: 'all', label: 'All Time' },
];

const RANGE_DAYS: Record<Exclude<ProgressRange, 'all'>, number> = {
  week: 7,
  month: 30,
  year: 365,
};

export const RANGE_CAPTION: Record<ProgressRange, string> = {
  week: 'Last 7 days',
  month: 'Last 30 days',
  year: 'Last 12 months',
  all: 'All time',
};

const PREVIOUS_LABEL: Record<Exclude<ProgressRange, 'all'>, string> = {
  week: 'last week',
  month: 'last month',
  year: 'last year',
};

type Session = { dateKey: string; durationSec: number; volumeLb?: number };

type FaithDay = { studyRead: boolean; journalDone: boolean };

export type ProgressInput = {
  range: ProgressRange;
  sessions: Session[];
  workoutDoneDays: string[];
  faithByDay: Record<string, FaithDay | undefined>;
};

export type ProgressSummary = {
  workouts: number;
  workoutsDelta: string;
  trainedSec: number;
  timeDelta: string;
  consistency: number;
  devotionals: number;
  devotionalsDelta: string;
  reflections: number;
  reflectionsDelta: string;
  rangeCaption: string;
};

function daysAgoKey(n: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return formatYmdLocal(d);
}

function daysBetweenInclusive(fromKey: string, toKey: string): number {
  const ms = parseYmdLocal(toKey).getTime() - parseYmdLocal(fromKey).getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

export function formatTrained(sec: number): string {
  const totalMin = Math.round(sec / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.max(0, Math.min(1, part / whole));
}

export function buildProgressSummary({
  range,
  sessions,
  workoutDoneDays,
  faithByDay,
}: ProgressInput): ProgressSummary {
  const today = daysAgoKey(0);

  let startKey: string;
  let prevStartKey: string | null = null;
  if (range === 'all') {
    const allKeys = [
      ...sessions.map((s) => s.dateKey),
      ...workoutDoneDays,
      ...Object.keys(faithByDay),
    ].filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k) && k <= today);
    startKey = allKeys.length > 0 ? allKeys.reduce((a, b) => (a < b ? a : b)) : today;
  } else {
    const n = RANGE_DAYS[range];
    startKey = daysAgoKey(n - 1);
    prevStartKey = daysAgoKey(2 * n - 1);
  }
  const days = daysBetweenInclusive(startKey, today);

  const inRange = (k: string) => k >= startKey && k <= today;
  const inPrev = (k: string) => prevStartKey != null && k >= prevStartKey && k < startKey;

  const current = sessions.filter((s) => inRange(s.dateKey));
  const previous = sessions.filter((s) => inPrev(s.dateKey));

  const trainedSec = current.reduce((a, s) => a + s.durationSec, 0);
  const prevSec = previous.reduce((a, s) => a + s.durationSec, 0);

  const trainedDays = new Set(
    [...sessions.map((s) => s.dateKey), ...workoutDoneDays].filter(inRange)
  );

  let devotionals = 0;
  let reflections = 0;
  let prevDevotionals = 0;
  let prevReflections = 0;
  for (const [key, day] of Object.entries(faithByDay)) {
    if (!day) continue;
    if (inRange(key)) {
      if (day.studyRead) devotionals++;
      if (day.journalDone) reflections++;
    } else if (inPrev(key)) {
      if (day.studyRead) prevDevotionals++;
      if (day.journalDone) prevReflections++;
    }
  }

  const faithDelta = (current: number, previous: number) => {
    if (range === 'all') return 'Total';
    const diff = current - previous;
    return `${diff >= 0 ? '+' : ''}${diff} vs ${PREVIOUS_LABEL[range]}`;
  };

  let workoutsDelta = 'Total';
  let timeDelta = 'Total';
  if (range !== 'all') {
    const diff = current.length - previous.length;
    workoutsDelta = `${diff >= 0 ? '+' : ''}${diff} vs ${PREVIOUS_LABEL[range]}`;
    if (prevSec > 0) {
      const change = Math.round(((trainedSec - prevSec) / prevSec) * 100);
      timeDelta = `${change >= 0 ? '+' : ''}${change}% vs ${PREVIOUS_LABEL[range]}`;
    } else {
      timeDelta = RANGE_CAPTION[range];
    }
  }

  return {
    workouts: current.length,
    workoutsDelta,
    trainedSec,
    timeDelta,
    consistency: pct(trainedDays.size, days),
    devotionals,
    devotionalsDelta: faithDelta(devotionals, prevDevotionals),
    reflections,
    reflectionsDelta: faithDelta(reflections, prevReflections),
    rangeCaption: RANGE_CAPTION[range],
  };
}

export type StrengthTrend = {
  points: number[];
  changePct: number | null;
  caption: string;
};

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function earliestKey(keys: string[]): string | null {
  return keys.reduce<string | null>((a, b) => (a == null || b < a ? b : a), null);
}

/** Week buckets for week/month, month buckets for year/all. */
function trendWindow(range: ProgressRange, earliest: string | null) {
  const now = new Date();
  now.setHours(12, 0, 0, 0);

  if (range === 'week' || range === 'month') {
    const count = 8;
    const thisMonday = mondayOfWeekContainingLocal(now);
    const keys = Array.from({ length: count }, (_, i) => {
      const d = new Date(thisMonday);
      d.setDate(d.getDate() - (count - 1 - i) * 7);
      return formatYmdLocal(d);
    });
    return {
      keys,
      bucketOf: (k: string) => formatYmdLocal(mondayOfWeekContainingLocal(parseYmdLocal(k))),
      caption: 'Last 8 weeks',
    };
  }

  const monthKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  let count = 12;
  if (range === 'all' && earliest) {
    const e = parseYmdLocal(earliest);
    const months =
      (now.getFullYear() - e.getFullYear()) * 12 + (now.getMonth() - e.getMonth()) + 1;
    count = Math.min(24, Math.max(2, months));
  }
  const keys = Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1, 12);
    return monthKey(d);
  });
  return {
    keys,
    bucketOf: (k: string) => k.slice(0, 7),
    caption: `Last ${count} months`,
  };
}

/** Change compares the later half of the buckets to the earlier half. */
function finishTrend(points: number[], caption: string): StrengthTrend {
  const half = Math.floor(points.length / 2);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const early = avg(points.slice(0, half));
  const late = avg(points.slice(half));
  const changePct = early > 0 ? Math.round(((late - early) / early) * 100) : null;
  return { points, changePct, caption };
}

/**
 * Lifted volume bucketed by week (week/month) or by month (year/all).
 */
export function buildStrengthTrend(range: ProgressRange, sessions: Session[]): StrengthTrend {
  const earliest = range === 'all' ? earliestKey(sessions.map((s) => s.dateKey)) : null;
  const { keys, bucketOf, caption } = trendWindow(range, earliest);
  const totals = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const s of sessions) {
    const b = bucketOf(s.dateKey);
    if (totals.has(b)) totals.set(b, totals.get(b)! + (s.volumeLb ?? 0));
  }
  return finishTrend(
    keys.map((k) => totals.get(k) ?? 0),
    caption,
  );
}

/**
 * Devotionals read plus reflections completed, using the same buckets as strength.
 */
export function buildFaithTrend(
  range: ProgressRange,
  faithByDay: Record<string, FaithDay | undefined>,
): StrengthTrend {
  const active = Object.entries(faithByDay)
    .filter(([k, day]) => DATE_KEY.test(k) && day && (day.studyRead || day.journalDone))
    .map(([k]) => k);
  const { keys, bucketOf, caption } = trendWindow(range, range === 'all' ? earliestKey(active) : null);
  const totals = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const [dateKey, day] of Object.entries(faithByDay)) {
    if (!day || !DATE_KEY.test(dateKey)) continue;
    const b = bucketOf(dateKey);
    if (!totals.has(b)) continue;
    totals.set(b, totals.get(b)! + (day.studyRead ? 1 : 0) + (day.journalDone ? 1 : 0));
  }
  return finishTrend(
    keys.map((k) => totals.get(k) ?? 0),
    caption,
  );
}
