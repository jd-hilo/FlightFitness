import { ensureExerciseSetRows } from '@/lib/exerciseNormalize';
import { formatDuration } from '@/lib/formatDuration';
import { parseTargetReps } from '@/lib/repUtils';
import { formatYmdLocal, mondayOfWeekContainingLocal, parseYmdLocal } from '@/lib/weekUtils';
import {
  setWasPerformed,
  type ExerciseHistoryEntry,
} from '@/stores/exerciseHistoryStore';
import type { WorkoutSessionLogEntry } from '@/stores/workoutSessionLogStore';
import type { Exercise } from '@/types/plan';

/** Epley estimated one-rep max. */
export function estimateOneRepMax(weightLb: number, reps: number): number {
  if (weightLb <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightLb;
  return weightLb * (1 + reps / 30);
}

/** Weight moved in a live session: sum of performed set weight × reps. */
export function volumeLbFromExercises(exercises: Exercise[]): number {
  let total = 0;
  for (const exercise of exercises) {
    const rows = ensureExerciseSetRows(exercise).setRows ?? [];
    for (const row of rows) {
      if (!setWasPerformed(row)) continue;
      const reps = parseTargetReps(row.actualReps ?? row.targetReps);
      const weight =
        typeof row.weightLb === 'number' && row.weightLb > 0 ? row.weightLb : 0;
      total += weight * reps;
    }
  }
  return Math.round(total);
}

export function volumeLbFromHistoryEntries(entries: ExerciseHistoryEntry[]): number {
  return Math.round(
    entries.reduce(
      (sum, e) =>
        sum + e.sets.reduce((s, set) => s + (set.weightLb ?? 0) * set.reps, 0),
      0
    )
  );
}

function volumeBySessionId(
  entries: ExerciseHistoryEntry[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of entries) {
    const vol = entry.sets.reduce(
      (s, set) => s + (set.weightLb ?? 0) * set.reps,
      0
    );
    map.set(entry.sessionId, (map.get(entry.sessionId) ?? 0) + vol);
  }
  for (const [id, vol] of map) {
    map.set(id, Math.round(vol));
  }
  return map;
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

  return result.sort((a, b) => b.points.length - a.points.length);
}

export type OverviewStats = {
  timesPerformed: number;
  lastPerformedKey: string | null;
  avgDurationSec: number;
  bestDurationSec: number;
  totalVolumeLb: number;
  lastVolumeLb: number;
};

const DUPLICATE_SESSION_WINDOW_MS = 90_000;

function dedupeNearDuplicateSessions(
  sessions: WorkoutSessionLogEntry[]
): WorkoutSessionLogEntry[] {
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime()
  );
  const out: WorkoutSessionLogEntry[] = [];
  for (const session of sorted) {
    const matchIdx = out.findIndex((existing) => {
      if (existing.sourceWorkoutId !== session.sourceWorkoutId) return false;
      return (
        Math.abs(
          new Date(existing.finishedAt).getTime() -
            new Date(session.finishedAt).getTime()
        ) < DUPLICATE_SESSION_WINDOW_MS
      );
    });
    if (matchIdx < 0) {
      out.push(session);
      continue;
    }
    const existing = out[matchIdx]!;
    const preferSession =
      session.durationSec > existing.durationSec ||
      (session.durationSec === existing.durationSec &&
        !!session.title &&
        !existing.title);
    const preferred = preferSession ? session : existing;
    const other = preferSession ? existing : session;
    out[matchIdx] = {
      ...preferred,
      title: preferred.title || other.title,
      durationSec: Math.max(existing.durationSec, session.durationSec),
      volumeLb: Math.max(existing.volumeLb ?? 0, session.volumeLb ?? 0),
    };
  }
  return out;
}

/** Combine logged sessions with session ids inferred from exercise history. */
export function mergeSessionsForInsights(
  sessions: WorkoutSessionLogEntry[],
  entries: ExerciseHistoryEntry[]
): WorkoutSessionLogEntry[] {
  const byId = new Map<string, WorkoutSessionLogEntry>();
  for (const session of sessions) {
    byId.set(session.id, { ...session, volumeLb: session.volumeLb ?? 0 });
  }

  const historyVolume = volumeBySessionId(entries);
  const entriesBySession = new Map<string, ExerciseHistoryEntry[]>();
  for (const entry of entries) {
    const list = entriesBySession.get(entry.sessionId) ?? [];
    list.push(entry);
    entriesBySession.set(entry.sessionId, list);
  }

  for (const [sessionId, sessionEntries] of entriesBySession) {
    const histVol = historyVolume.get(sessionId) ?? 0;
    const existing = byId.get(sessionId);
    if (existing) {
      byId.set(sessionId, {
        ...existing,
        volumeLb: Math.max(existing.volumeLb ?? 0, histVol),
      });
      continue;
    }
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
      volumeLb: histVol,
    });
  }

  const merged = dedupeNearDuplicateSessions([...byId.values()]);
  return merged.map((session) => {
    if ((session.volumeLb ?? 0) > 0) return session;
    const histVol = historyVolume.get(session.id) ?? 0;
    if (histVol > 0) return { ...session, volumeLb: histVol };
    const dayVol = entries
      .filter(
        (e) =>
          e.sourceWorkoutId === session.sourceWorkoutId &&
          e.dateKey === session.dateKey &&
          Math.abs(
            new Date(e.finishedAt).getTime() -
              new Date(session.finishedAt).getTime()
          ) < DUPLICATE_SESSION_WINDOW_MS
      )
      .reduce(
        (sum, e) =>
          sum + e.sets.reduce((s, set) => s + (set.weightLb ?? 0) * set.reps, 0),
        0
      );
    return { ...session, volumeLb: Math.round(dayVol) };
  });
}

export function buildOverview(
  sessions: WorkoutSessionLogEntry[],
  entries: ExerciseHistoryEntry[]
): OverviewStats {
  const mergedSessions = mergeSessionsForInsights(sessions, entries);
  const timedSessions = mergedSessions.filter((s) => s.durationSec > 0);

  const sessionVolume = mergedSessions.reduce(
    (sum, s) => sum + (s.volumeLb ?? 0),
    0
  );
  const historyVolume = volumeLbFromHistoryEntries(entries);
  const totalVolumeLb = Math.max(sessionVolume, historyVolume);

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
  const lastVolumeLb = mergedSessions[0]?.volumeLb ?? 0;
  return {
    timesPerformed: mergedSessions.length,
    lastPerformedKey,
    avgDurationSec,
    bestDurationSec,
    totalVolumeLb: Math.round(totalVolumeLb),
    lastVolumeLb: Math.round(lastVolumeLb),
  };
}

export type WeekFrequencyPoint = {
  weekStartKey: string;
  label: string;
  count: number;
};

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

export function buildDurationTrend(
  sessions: WorkoutSessionLogEntry[],
  entries: ExerciseHistoryEntry[] = [],
  limit = 3
): DurationPoint[] {
  return mergeSessionsForInsights(sessions, entries)
    .filter((s) => s.durationSec > 0)
    .sort(
      (a, b) =>
        new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime()
    )
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

/** Short, scannable lines for a single workout's insights. */
export function buildWorkoutTakeaways(
  sessions: WorkoutSessionLogEntry[],
  entries: ExerciseHistoryEntry[]
): string[] {
  const overview = buildOverview(sessions, entries);
  const merged = mergeSessionsForInsights(sessions, entries);
  const progress = buildExerciseProgress(entries);
  const lines: string[] = [];

  if (overview.timesPerformed <= 0) {
    return ['Finish this workout once to unlock insights.'];
  }

  lines.push(
    overview.timesPerformed === 1
      ? 'Completed once so far.'
      : `Completed ${overview.timesPerformed} times.`
  );

  if (overview.totalVolumeLb > 0) {
    lines.push(`Moved ${formatVolume(overview.totalVolumeLb)} total.`);
  } else {
    lines.push('Mark sets complete with weight to track weight moved.');
  }

  if (overview.avgDurationSec > 0) {
    lines.push(`Average session ${formatDuration(overview.avgDurationSec)}.`);
  }

  const lifter = progress.find(
    (p) => p.points.length >= 2 && p.latestTopWeightLb > 0
  );
  if (lifter) {
    const first = lifter.points[0]!.topWeightLb;
    const last = lifter.latestTopWeightLb;
    const delta = Math.round(last - first);
    if (delta > 0) {
      lines.push(`${lifter.name}: +${delta} lb on your top set.`);
    } else if (delta < 0) {
      lines.push(
        `${lifter.name}: top set is ${Math.abs(delta)} lb under your first log.`
      );
    } else if (last > 0) {
      lines.push(
        `${lifter.name}: holding ${Math.round(last)} lb on your top set.`
      );
    }
  } else if (progress[0]?.latestTopWeightLb) {
    lines.push(
      `${progress[0].name}: last top set ${Math.round(progress[0].latestTopWeightLb)} lb.`
    );
  }

  const recent = merged.slice(0, 2);
  if (
    recent.length === 2 &&
    (recent[0]!.volumeLb ?? 0) > 0 &&
    (recent[1]!.volumeLb ?? 0) > 0
  ) {
    const delta = (recent[0]!.volumeLb ?? 0) - (recent[1]!.volumeLb ?? 0);
    if (delta > 50) {
      lines.push(
        `Last session moved ${formatVolume(delta)} more than the one before.`
      );
    }
  }

  return lines.slice(0, 4);
}

export function formatVolume(lb: number): string {
  if (lb >= 1000) {
    const k = lb / 1000;
    return `${k >= 10 ? Math.round(k) : Math.round(k * 10) / 10}k lb`;
  }
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
