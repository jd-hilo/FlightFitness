import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ensureExerciseSetRows, newId, syncExerciseAggregateFromSetRows } from '@/lib/exerciseNormalize';
import { parseTargetReps } from '@/lib/repUtils';
import type { Exercise, ExerciseSetRow } from '@/types/plan';
import type { SavedWorkout } from '@/stores/workoutLibraryStore';

export type ActiveWorkoutSession = {
  sessionId: string;
  sourceWorkoutId: string;
  title: string;
  exercises: Exercise[];
  startedAt: string;
  pausedAt: string | null;
  accumulatedPauseMs: number;
  finishedAt: string | null;
};

type ActiveWorkoutState = {
  session: ActiveWorkoutSession | null;
  startSession: (workout: SavedWorkout) => void;
  finishSession: () => void;
  cancelSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  toggleSetComplete: (exerciseIndex: number, setRowIndex: number) => void;
  completeSetRow: (exerciseIndex: number, setRowIndex: number) => void;
  updateSetRow: (
    exerciseIndex: number,
    setRowIndex: number,
    patch: Partial<ExerciseSetRow>
  ) => void;
  addExercise: (exercise: Exercise) => void;
  getElapsedSeconds: () => number;
};

export function cloneExerciseForSession(exercise: Exercise): Exercise {
  const base = ensureExerciseSetRows(exercise);
  return {
    ...base,
    id: newId('ex'),
    setRows: base.setRows?.map((row) => ({
      ...row,
      id: newId('set'),
      completed: false,
      actualReps: row.actualReps ?? String(parseTargetReps(row.targetReps)),
    })),
  };
}

function cloneExercisesForSession(exercises: Exercise[]): Exercise[] {
  return exercises.map(cloneExerciseForSession);
}

export const useActiveWorkoutStore = create<ActiveWorkoutState>()(
  persist(
    (set, get) => ({
      session: null,

      startSession: (workout) => {
        set({
          session: {
            sessionId: newId('session'),
            sourceWorkoutId: workout.id,
            title: workout.title,
            exercises: cloneExercisesForSession(workout.exercises),
            startedAt: new Date().toISOString(),
            pausedAt: null,
            accumulatedPauseMs: 0,
            finishedAt: null,
          },
        });
      },

      finishSession: () => {
        const s = get().session;
        if (!s) return;
        set({ session: { ...s, finishedAt: new Date().toISOString() } });
        set({ session: null });
      },

      cancelSession: () => set({ session: null }),

      pauseSession: () => {
        const s = get().session;
        if (!s || s.pausedAt || s.finishedAt) return;
        set({ session: { ...s, pausedAt: new Date().toISOString() } });
      },

      resumeSession: () => {
        const s = get().session;
        if (!s?.pausedAt) return;
        const pauseMs = Date.now() - new Date(s.pausedAt).getTime();
        set({
          session: {
            ...s,
            pausedAt: null,
            accumulatedPauseMs: s.accumulatedPauseMs + Math.max(0, pauseMs),
          },
        });
      },

      toggleSetComplete: (exerciseIndex, setRowIndex) => {
        set((state) => {
          const s = state.session;
          if (!s) return state;
          const exercises = s.exercises.map((ex, ei) => {
            if (ei !== exerciseIndex) return ex;
            const normalized = ensureExerciseSetRows(ex);
            const rows = (normalized.setRows ?? []).map((row, ri) =>
              ri === setRowIndex ? { ...row, completed: !row.completed } : row
            );
            return syncExerciseAggregateFromSetRows({ ...normalized, setRows: rows });
          });
          return { session: { ...s, exercises } };
        });
      },

      completeSetRow: (exerciseIndex, setRowIndex) => {
        set((state) => {
          const s = state.session;
          if (!s) return state;
          const exercises = s.exercises.map((ex, ei) => {
            if (ei !== exerciseIndex) return ex;
            const normalized = ensureExerciseSetRows(ex);
            const rows = (normalized.setRows ?? []).map((row, ri) => {
              if (ri !== setRowIndex) return row;
              const actualReps =
                row.actualReps?.trim() || String(parseTargetReps(row.targetReps));
              return { ...row, completed: true, actualReps };
            });
            return syncExerciseAggregateFromSetRows({ ...normalized, setRows: rows });
          });
          return { session: { ...s, exercises } };
        });
      },

      updateSetRow: (exerciseIndex, setRowIndex, patch) => {
        set((state) => {
          const s = state.session;
          if (!s) return state;
          const exercises = s.exercises.map((ex, ei) => {
            if (ei !== exerciseIndex) return ex;
            const normalized = ensureExerciseSetRows(ex);
            const rows = (normalized.setRows ?? []).map((row, ri) =>
              ri === setRowIndex ? { ...row, ...patch } : row
            );
            return syncExerciseAggregateFromSetRows({ ...normalized, setRows: rows });
          });
          return { session: { ...s, exercises } };
        });
      },

      addExercise: (exercise) => {
        set((state) => {
          const s = state.session;
          if (!s) return state;
          return {
            session: {
              ...s,
              exercises: [...s.exercises, cloneExerciseForSession(exercise)],
            },
          };
        });
      },

      getElapsedSeconds: () => {
        const s = get().session;
        if (!s) return 0;
        const start = new Date(s.startedAt).getTime();
        const end = s.pausedAt ? new Date(s.pausedAt).getTime() : Date.now();
        const elapsedMs = end - start - s.accumulatedPauseMs;
        return Math.max(0, Math.floor(elapsedMs / 1000));
      },
    }),
    {
      name: 'flight-active-workout',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
