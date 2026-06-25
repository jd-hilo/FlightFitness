import { formatYmdLocal, mondayOfWeekContainingLocal, parseYmdLocal } from '@/lib/weekUtils';
import type { ExerciseHistoryEntry } from '@/stores/exerciseHistoryStore';
import type { WorkoutSessionLogEntry } from '@/stores/workoutSessionLogStore';

/** Epley estimated one-rep max. */
export function estimateOneRepMax(weightLb: number, reps: number): number {
  if (weightLb <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightLb;
  return weightLb * (1 + reps / 30);
}

export type ExerciseSessionPoint = {
  dateKey: string;
  finishedAt: string;
  topWeightLb: number;
  bestOneRm: number;
  volumeLb: number;
};

export type ExerciseProgress = {
  exerciseKey: string;
  name: string;
  catalogExerciseId?: string;
  points: ExerciseSessionPoint[];
  latestTopWeightLb: number;
  bestTopWeightLb: number;
  latestOneRm: number;
  bestOneRm: number;
  totalVolumeLb: number;
};

function pointFromEntry(entry: ExerciseHistoryEntry): ExerciseSessionPoint {
  let topWeightLb = 0;
  let bestOneRm = 0;
  let volumeLb = 0;
  for (const set of entry.sets) {
    const weight = set.weightLb ?? 0;
    if (weight > topWeightLb) topWeightLb = weight;
    const oneRm = estimateOneRepMax(weight, set.reps);
    if (oneRm > bestOneRm) bestOneRm = oneRm;
    volumeLb += weight * set.reps;
  }
  return {
    dateKey: entry.dateKey,
    finishedAt: entry.finishedAt,
    topWeightLb,
    bestOneRm: Math.round(bestOneRm),
    volumeLb: Math.round(volumeLb),
  };
}

/** Per-exercise progression, sorted oldest → newest, grouped by movement. */
export function buildExerciseProgress(
  entries: ExerciseHistoryEntry[]
): ExerciseProgress[] {
  const byKey = new Map<string, ExerciseHistoryEntry[]>();
  for (const entry of entries) {
    const list = byKey.get(entry.exerciseKey) ?? [];
    list.push(entry);
    byKey.set(entry.exerciseKey, list);
  }

  const result: ExerciseProgress[] = [];
  for (const [exerciseKey, list] of byKey) {
    const sorted = [...list].sort(
      (a, b) => new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime()
    );
    const points = sorted.map(pointFromEntry);
    const latest = points[points.length - 1];
    result.push({
      exerciseKey,
      name: sorted[sorted.length - 1]!.exerciseName,
      catalogExerciseId: sorted[sorted.length - 1]!.catalogExerciseId,
      points,
      latestTopWeightLb: latest?.topWeightLb ?? 0,
      bestTopWeightLb: points.reduce((m, p) => Math.max(m, p.topWeightLb), 0),
      latestOneRm: latest?.bestOneRm ?? 0,
      bestOneRm: points.reduce((m, p) => Math.max(m, p.bestOneRm), 0),
      totalVolumeLb: points.reduce((sum, p) => sum + p.volumeLb, 0),
    });
  }

  // Most-tracked movements first.
  return result.sort((a, b) => b.points.length - a.points.length);
}

export type OverviewStats = {
  timesPerformed: number;
  lastPerformedKey: string | null;
  avgDurationSec: number;
  bestDurationSec: number;
  totalVolumeLb: number;
};

/** Combine logged sessions with session ids inferred from exercise history. */
export function mergeSessionsForInsights(
  sessions: WorkoutSessionLogEntry[],
  entries: ExerciseHistoryEntry[]
): WorkoutSessionLogEntry[] {
  const byId = new Map<string, WorkoutSessionLogEntry>();
  for (const session of sessions) {
    byId.set(session.id, session);
  }

  const entriesBySession = new Map<string, ExerciseHistoryEntry[]>();
  for (const entry of entries) {
    const list = entriesBySession.get(entry.sessionId) ?? [];
    list.push(entry);
    entriesBySession.set(entry.sessionId, list);
  }

  for (const [sessionId, sessionEntries] of entriesBySession) {
    if (byId.has(sessionId)) continue;
    const sorted = [...sessionEntries].sort(
      (a, b) => new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime()
    );
    const first = sorted[0]!;
    byId.set(sessionId, {
      id: sessionId,
      title: '',
      sourceWorkoutId: first.sourceWorkoutId,
      dateKey: first.dateKey,
      finishedAt: first.finishedAt,
      durationSec: 0,
    });
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime()
  );
}

export function buildOverview(
  sessions: WorkoutSessionLogEntry[],
  entries: ExerciseHistoryEntry[]
): OverviewStats {
  const mergedSessions = mergeSessionsForInsights(sessions, entries);
  const timedSessions = mergedSessions.filter((s) => s.durationSec > 0);

  const totalVolumeLb = entries.reduce((sum, e) => {
    return (
      sum + e.sets.reduce((s, set) => s + (set.weightLb ?? 0) * set.reps, 0)
    );
  }, 0);
  const avgDurationSec =
    timedSessions.length > 0
      ? Math.round(
          timedSessions.reduce((s, x) => s + x.durationSec, 0) /
            timedSessions.length
        )
      : 0;
  const bestDurationSec =
    timedSessions.length > 0
      ? Math.max(...timedSessions.map((s) => s.durationSec))
      : 0;
  const lastPerformedKey =
    mergedSessions.length > 0 ? mergedSessions[0]!.dateKey : null;
  return {
    timesPerformed: mergedSessions.length,
    lastPerformedKey,
    avgDurationSec,
    bestDurationSec,
    totalVolumeLb: Math.round(totalVolumeLb),
  };
}

export type WeekFrequencyPoint = {
  weekStartKey: string;
  label: string;
  count: number;
};

/** Sessions per week for the last `weeks` weeks (oldest → newest). */
export function buildWeeklyFrequency(
  sessions: WorkoutSessionLogEntry[],
  entries: ExerciseHistoryEntry[] = [],
  weeks = 8
): WeekFrequencyPoint[] {
  const mergedSessions = mergeSessionsForInsights(sessions, entries);
  const counts = new Map<string, number>();
  for (const s of mergedSessions) {
    const monday = mondayOfWeekContainingLocal(parseYmdLocal(s.dateKey));
    const key = formatYmdLocal(monday);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const out: WeekFrequencyPoint[] = [];
  const thisMonday = mondayOfWeekContainingLocal(new Date());
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisMonday);
    d.setDate(d.getDate() - i * 7);
    const key = formatYmdLocal(d);
    out.push({
      weekStartKey: key,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      count: counts.get(key) ?? 0,
    });
  }
  return out;
}

export type DurationPoint = {
  dateKey: string;
  label: string;
  durationSec: number;
};

/** Most recent `limit` timed sessions (oldest → newest) for the duration trend. */
export function buildDurationTrend(
  sessions: WorkoutSessionLogEntry[],
  entries: ExerciseHistoryEntry[] = [],
  limit = 10
): DurationPoint[] {
  return mergeSessionsForInsights(sessions, entries)
    .filter((s) => s.durationSec > 0)
    .sort((a, b) => new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime())
    .slice(-limit)
    .map((s) => {
      const d = parseYmdLocal(s.dateKey);
      return {
        dateKey: s.dateKey,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        durationSec: s.durationSec,
      };
    });
}

export function formatVolume(lb: number): string {
  return `${Math.round(lb).toLocaleString()} lb`;
}

export function formatRelativeDate(dateKey: string | null): string {
  if (!dateKey) return '—';
  const date = parseYmdLocal(dateKey);
  const today = parseYmdLocal(formatYmdLocal(new Date()));
  const diffDays = Math.round(
    (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return 'Last week';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return 'Last month';
  return `${Math.floor(diffDays / 30)} months ago`;
}
