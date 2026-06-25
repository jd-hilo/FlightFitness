import {
  ensureFreshSessionForEdge,
  supabase,
  supabaseConfigured,
} from '@/lib/supabase';
import {
  normalizeDay,
  useCompletionStore,
  type DayCompletion,
} from '@/stores/completionStore';
import {
  useExerciseHistoryStore,
  type ExerciseHistoryEntry,
  type LoggedSetSnapshot,
} from '@/stores/exerciseHistoryStore';
import { useWeightLogStore, type WeightLogEntry } from '@/stores/weightLogStore';
import {
  useWorkoutLibraryStore,
  type SavedWorkout,
} from '@/stores/workoutLibraryStore';
import {
  useWorkoutSessionLogStore,
  type WorkoutSessionLogEntry,
} from '@/stores/workoutSessionLogStore';
import type { Exercise } from '@/types/plan';

let isHydratingTracking = false;
let saveChain: Promise<void> = Promise.resolve();

function shouldSkipRemoteSave() {
  return isHydratingTracking;
}

async function requireUserId(): Promise<string | null> {
  if (!supabaseConfigured || !supabase) return null;
  const session = await ensureFreshSessionForEdge();
  return session?.user?.id ?? null;
}

function mergeWeightEntries(
  local: WeightLogEntry[],
  remote: WeightLogEntry[]
): WeightLogEntry[] {
  const map = new Map<string, WeightLogEntry>();
  for (const e of local) map.set(e.dateKey, e);
  for (const r of remote) {
    const cur = map.get(r.dateKey);
    if (!cur || r.updatedAt >= cur.updatedAt) map.set(r.dateKey, r);
  }
  return [...map.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

function mergeWorkouts(local: SavedWorkout[], remote: SavedWorkout[]): SavedWorkout[] {
  const map = new Map<string, SavedWorkout>();
  for (const w of local) map.set(w.id, w);
  for (const r of remote) {
    const cur = map.get(r.id);
    if (!cur || r.updatedAt >= cur.updatedAt) map.set(r.id, r);
  }
  return [...map.values()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

function mergeSessions(
  local: WorkoutSessionLogEntry[],
  remote: WorkoutSessionLogEntry[]
): WorkoutSessionLogEntry[] {
  const map = new Map<string, WorkoutSessionLogEntry>();
  for (const s of [...remote, ...local]) map.set(s.id, s);
  return [...map.values()]
    .sort((a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime())
    .slice(0, 200);
}

function mergeExerciseHistory(
  local: ExerciseHistoryEntry[],
  remote: ExerciseHistoryEntry[]
): ExerciseHistoryEntry[] {
  const map = new Map<string, ExerciseHistoryEntry>();
  for (const e of [...remote, ...local]) map.set(e.id, e);
  return [...map.values()]
    .sort((a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime())
    .slice(0, 1000);
}

function mergeDayCompletion(a: DayCompletion, b: DayCompletion): DayCompletion {
  const mealIds = [...new Set([...a.mealIds, ...b.mealIds])];
  const exerciseIdsDone = [
    ...new Set([...a.exerciseIdsDone, ...b.exerciseIdsDone]),
  ];
  return {
    mealIds,
    workoutDone: a.workoutDone || b.workoutDone,
    exerciseIdsDone,
  };
}

function mergeByDay(
  local: Record<string, DayCompletion>,
  remote: Record<string, DayCompletion>
): Record<string, DayCompletion> {
  const keys = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const out: Record<string, DayCompletion> = {};
  for (const key of keys) {
    out[key] = mergeDayCompletion(
      normalizeDay(local[key]),
      normalizeDay(remote[key])
    );
  }
  return out;
}

function rowToDay(row: {
  date_key: string;
  meal_ids: unknown;
  workout_done: boolean;
  exercise_ids_done: unknown;
}): [string, DayCompletion] {
  const mealIds = Array.isArray(row.meal_ids)
    ? row.meal_ids.filter((x): x is string => typeof x === 'string')
    : [];
  const exerciseIdsDone = Array.isArray(row.exercise_ids_done)
    ? row.exercise_ids_done.filter((x): x is string => typeof x === 'string')
    : [];
  return [
    row.date_key,
    { mealIds, workoutDone: row.workout_done, exerciseIdsDone },
  ];
}

async function pushWeightEntries(uid: string, entries: WeightLogEntry[]) {
  if (!supabase || entries.length === 0) return;
  const rows = entries.map((e) => ({
    user_id: uid,
    date_key: e.dateKey,
    weight_lb: e.weightLb,
    updated_at: e.updatedAt,
  }));
  const { error } = await supabase.from('weight_entries').upsert(rows, {
    onConflict: 'user_id,date_key',
  });
  if (error && __DEV__) console.warn('[tracking] weight upsert', error.message);
}

async function pushWorkoutLibrary(uid: string, workouts: SavedWorkout[]) {
  if (!supabase) return;
  const { data: remoteRows, error: listError } = await supabase
    .from('user_workouts')
    .select('id')
    .eq('user_id', uid);
  if (listError && __DEV__) {
    console.warn('[tracking] workout list', listError.message);
    return;
  }
  const localIds = new Set(workouts.map((w) => w.id));
  const toDelete = (remoteRows ?? [])
    .map((r) => r.id as string)
    .filter((id) => !localIds.has(id));
  if (toDelete.length > 0) {
    await supabase
      .from('user_workouts')
      .delete()
      .eq('user_id', uid)
      .in('id', toDelete);
  }
  if (workouts.length === 0) return;
  const rows = workouts.map((w) => ({
    user_id: uid,
    id: w.id,
    title: w.title,
    exercises: w.exercises,
    created_at: w.createdAt,
    updated_at: w.updatedAt,
  }));
  const { error } = await supabase.from('user_workouts').upsert(rows, {
    onConflict: 'user_id,id',
  });
  if (error && __DEV__) console.warn('[tracking] workouts upsert', error.message);
}

async function pushWorkoutSessions(uid: string, sessions: WorkoutSessionLogEntry[]) {
  if (!supabase || sessions.length === 0) return;
  const rows = sessions.map((s) => ({
    user_id: uid,
    id: s.id,
    source_workout_id: s.sourceWorkoutId,
    title: s.title,
    date_key: s.dateKey,
    finished_at: s.finishedAt,
    duration_sec: s.durationSec,
  }));
  const { error } = await supabase.from('workout_sessions').upsert(rows, {
    onConflict: 'user_id,id',
  });
  if (error && __DEV__) console.warn('[tracking] sessions upsert', error.message);
}

async function pushExerciseHistory(uid: string, entries: ExerciseHistoryEntry[]) {
  if (!supabase || entries.length === 0) return;
  const rows = entries.map((e) => ({
    user_id: uid,
    id: e.id,
    session_id: e.sessionId,
    source_workout_id: e.sourceWorkoutId,
    exercise_key: e.exerciseKey,
    exercise_name: e.exerciseName,
    catalog_exercise_id: e.catalogExerciseId ?? null,
    date_key: e.dateKey,
    finished_at: e.finishedAt,
    sets: e.sets,
  }));
  const { error } = await supabase.from('exercise_history').upsert(rows, {
    onConflict: 'user_id,id',
  });
  if (error && __DEV__) console.warn('[tracking] exercise history upsert', error.message);
}

async function pushDailyCompletions(
  uid: string,
  byDay: Record<string, DayCompletion>
) {
  if (!supabase) return;
  const keys = Object.keys(byDay);
  if (keys.length === 0) return;
  const now = new Date().toISOString();
  const rows = keys.map((dateKey) => {
    const day = normalizeDay(byDay[dateKey]);
    return {
      user_id: uid,
      date_key: dateKey,
      meal_ids: day.mealIds,
      workout_done: day.workoutDone,
      exercise_ids_done: day.exerciseIdsDone,
      updated_at: now,
    };
  });
  const { error } = await supabase.from('daily_completions').upsert(rows, {
    onConflict: 'user_id,date_key',
  });
  if (error && __DEV__) console.warn('[tracking] completions upsert', error.message);
}

async function pushActivityMeta(
  uid: string,
  streak: number,
  lastStreakIncrementDate: string | null
) {
  if (!supabase) return;
  const { error } = await supabase.from('user_activity_meta').upsert(
    {
      user_id: uid,
      training_streak: streak,
      last_streak_increment_date: lastStreakIncrementDate,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error && __DEV__) console.warn('[tracking] activity meta upsert', error.message);
}

export async function pushAllTrackingToRemote(): Promise<void> {
  if (shouldSkipRemoteSave()) return;
  const uid = await requireUserId();
  if (!uid) return;

  const weight = useWeightLogStore.getState().entries;
  const workouts = useWorkoutLibraryStore.getState().workouts;
  const sessions = useWorkoutSessionLogStore.getState().sessions;
  const exerciseHistory = useExerciseHistoryStore.getState().entries;
  const { byDay, streak, lastStreakIncrementDate } = useCompletionStore.getState();

  await pushWeightEntries(uid, weight);
  await pushWorkoutLibrary(uid, workouts);
  await pushWorkoutSessions(uid, sessions);
  await pushExerciseHistory(uid, exerciseHistory);
  await pushDailyCompletions(uid, byDay);
  await pushActivityMeta(uid, streak, lastStreakIncrementDate);
}

export function scheduleTrackingRemoteSave(delayMs = 800) {
  if (shouldSkipRemoteSave()) return;
  saveChain = saveChain.then(async () => {
    await new Promise((r) => setTimeout(r, delayMs));
    await pushAllTrackingToRemote();
  });
}

export async function deleteRemoteWorkout(workoutId: string) {
  const uid = await requireUserId();
  if (!uid || !supabase) return;
  await supabase.from('user_workouts').delete().eq('user_id', uid).eq('id', workoutId);
}

export async function pullUserTrackingIntoStores(): Promise<void> {
  if (!supabaseConfigured || !supabase) return;
  const uid = await requireUserId();
  if (!uid) return;

  isHydratingTracking = true;
  try {
    const localWeight = useWeightLogStore.getState().entries;
    const localWorkouts = useWorkoutLibraryStore.getState().workouts;
    const localSessions = useWorkoutSessionLogStore.getState().sessions;
    const localHistory = useExerciseHistoryStore.getState().entries;
    const localCompletion = useCompletionStore.getState();

    const [weightRes, workoutsRes, sessionsRes, historyRes, daysRes, metaRes] =
      await Promise.all([
      supabase.from('weight_entries').select('date_key,weight_lb,updated_at').eq('user_id', uid),
      supabase
        .from('user_workouts')
        .select('id,title,exercises,created_at,updated_at')
        .eq('user_id', uid)
        .order('updated_at', { ascending: false }),
      supabase
        .from('workout_sessions')
        .select('id,source_workout_id,title,date_key,finished_at,duration_sec')
        .eq('user_id', uid)
        .order('finished_at', { ascending: false })
        .limit(200),
      supabase
        .from('exercise_history')
        .select(
          'id,session_id,source_workout_id,exercise_key,exercise_name,catalog_exercise_id,date_key,finished_at,sets'
        )
        .eq('user_id', uid)
        .order('finished_at', { ascending: false })
        .limit(1000),
      supabase.from('daily_completions').select('*').eq('user_id', uid),
      supabase
        .from('user_activity_meta')
        .select('training_streak,last_streak_increment_date')
        .eq('user_id', uid)
        .maybeSingle(),
    ]);

    const remoteWeight: WeightLogEntry[] = (weightRes.data ?? []).map((r) => ({
      dateKey: r.date_key,
      weightLb: Number(r.weight_lb),
      updatedAt: r.updated_at,
    }));

    const remoteWorkouts: SavedWorkout[] = (workoutsRes.data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      exercises: (Array.isArray(r.exercises) ? r.exercises : []) as Exercise[],
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    const remoteSessions: WorkoutSessionLogEntry[] = (sessionsRes.data ?? []).map((r) => ({
      id: r.id,
      sourceWorkoutId: r.source_workout_id,
      title: r.title,
      dateKey: r.date_key,
      finishedAt: r.finished_at,
      durationSec: Math.max(0, Number(r.duration_sec) || 0),
    }));

    const remoteHistory: ExerciseHistoryEntry[] = (historyRes.data ?? []).map((r) => ({
      id: r.id,
      sessionId: r.session_id,
      sourceWorkoutId: r.source_workout_id,
      exerciseKey: r.exercise_key,
      exerciseName: r.exercise_name,
      catalogExerciseId: r.catalog_exercise_id ?? undefined,
      dateKey: r.date_key,
      finishedAt: r.finished_at,
      sets: (Array.isArray(r.sets) ? r.sets : []) as LoggedSetSnapshot[],
    }));

    const remoteByDay: Record<string, DayCompletion> = {};
    for (const row of daysRes.data ?? []) {
      const [key, day] = rowToDay(row);
      remoteByDay[key] = day;
    }

    const mergedWeight = mergeWeightEntries(localWeight, remoteWeight);
    const mergedWorkouts = mergeWorkouts(localWorkouts, remoteWorkouts);
    const mergedSessions = mergeSessions(localSessions, remoteSessions);
    const mergedHistory = mergeExerciseHistory(localHistory, remoteHistory);
    const mergedByDay = mergeByDay(localCompletion.byDay, remoteByDay);

    useWeightLogStore.setState({ entries: mergedWeight });
    useWorkoutLibraryStore.setState({ workouts: mergedWorkouts });
    useWorkoutSessionLogStore.setState({ sessions: mergedSessions });
    useExerciseHistoryStore.setState({ entries: mergedHistory });

    const remoteStreak = metaRes.data?.training_streak;
    const remoteLast = metaRes.data?.last_streak_increment_date ?? null;
    useCompletionStore.setState({
      byDay: mergedByDay,
      streak:
        typeof remoteStreak === 'number'
          ? Math.max(localCompletion.streak, remoteStreak)
          : localCompletion.streak,
      lastStreakIncrementDate: remoteLast ?? localCompletion.lastStreakIncrementDate,
    });

    const remoteEmpty =
      remoteWeight.length === 0 &&
      remoteWorkouts.length === 0 &&
      remoteSessions.length === 0 &&
      remoteHistory.length === 0 &&
      Object.keys(remoteByDay).length === 0;

    const localHasData =
      localWeight.length > 0 ||
      localWorkouts.length > 0 ||
      localSessions.length > 0 ||
      localHistory.length > 0 ||
      Object.keys(localCompletion.byDay).length > 0;

    if (remoteEmpty && localHasData) {
      isHydratingTracking = false;
      await pushAllTrackingToRemote();
    }
  } finally {
    isHydratingTracking = false;
  }
}
