import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ensureExerciseSetRows, newId } from '@/lib/exerciseNormalize';
import { parseTargetReps } from '@/lib/repUtils';
import { formatYmdLocal } from '@/lib/weekUtils';
import { scheduleTrackingRemoteSave } from '@/lib/api/trackingPersistence';
import type { Exercise, ExerciseSetRow } from '@/types/plan';

export type LoggedSetSnapshot = {
  weightLb?: number;
  reps: number;
};

export type ExerciseHistoryEntry = {
  id: string;
  sessionId: string;
  sourceWorkoutId: string;
  /** Stable key for matching the same movement across sessions. */
  exerciseKey: string;
  exerciseName: string;
  catalogExerciseId?: string;
  dateKey: string;
  finishedAt: string;
  sets: LoggedSetSnapshot[];
};

const MAX_ENTRIES = 1000;

/** Stable identity for a movement across sessions (ids are regenerated each session). */
export function exerciseHistoryKey(exercise: {
  catalogExerciseId?: string;
  name: string;
}): string {
  const catalog = exercise.catalogExerciseId?.trim();
  if (catalog) return `catalog:${catalog}`;
  return `name:${exercise.name.trim().toLowerCase()}`;
}

/**
 * A set counts as performed if checked complete, or if the athlete logged
 * actual reps (checkmark or reps stepper). Weight alone is not enough —
 * previous-session weights are prefilled on Begin.
 */
export function setWasPerformed(row: ExerciseSetRow): boolean {
  if (row.completed === true) return true;
  if (row.actualReps?.trim()) return true;
  return false;
}

function snapshotExercise(exercise: Exercise): LoggedSetSnapshot[] {
  const normalized = ensureExerciseSetRows(exercise);
  const rows = normalized.setRows ?? [];
  return rows
    .filter((row) => setWasPerformed(row))
    .map((row) => {
      const reps = parseTargetReps(row.actualReps ?? row.targetReps);
      const weightLb =
        typeof row.weightLb === 'number' && row.weightLb > 0 ? row.weightLb : undefined;
      return { weightLb, reps };
    });
}

type ExerciseHistoryState = {
  entries: ExerciseHistoryEntry[];
  logSession: (input: {
    sessionId: string;
    sourceWorkoutId: string;
    exercises: Exercise[];
    finishedAt?: string;
  }) => number;
  entriesForWorkout: (sourceWorkoutId: string) => ExerciseHistoryEntry[];
  reset: () => void;
};

export const useExerciseHistoryStore = create<ExerciseHistoryState>()(
  persist(
    (set, get) => ({
      entries: [],

      logSession: ({ sessionId, sourceWorkoutId, exercises, finishedAt }) => {
        const at = finishedAt ?? new Date().toISOString();
        const dateKey = formatYmdLocal(new Date(at));
        const newEntries: ExerciseHistoryEntry[] = [];

        for (const exercise of exercises) {
          const sets = snapshotExercise(exercise);
          if (sets.length === 0) continue;
          newEntries.push({
            id: newId('exhist'),
            sessionId,
            sourceWorkoutId,
            exerciseKey: exerciseHistoryKey(exercise),
            exerciseName: exercise.name,
            catalogExerciseId: exercise.catalogExerciseId,
            dateKey,
            finishedAt: at,
            sets,
          });
        }

        if (newEntries.length === 0) return 0;
        set({ entries: [...newEntries, ...get().entries].slice(0, MAX_ENTRIES) });
        scheduleTrackingRemoteSave(0);
        return newEntries.length;
      },

      entriesForWorkout: (sourceWorkoutId) =>
        get().entries.filter((e) => e.sourceWorkoutId === sourceWorkoutId),

      reset: () => set({ entries: [] }),
    }),
    {
      name: 'flight-exercise-history',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
