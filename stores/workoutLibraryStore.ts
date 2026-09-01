import { create } from 'zustand';

import { ensureExerciseSetRows, newId, syncExerciseAggregateFromSetRows } from '@/lib/exerciseNormalize';
import { deleteRemoteWorkout, scheduleTrackingRemoteSave } from '@/lib/api/trackingPersistence';
import { cleanupSupersetGroups } from '@/lib/superset';
import { canAddSavedWorkout, useSubscriptionStore } from '@/stores/subscriptionStore';
import type { Exercise } from '@/types/plan';

export type SavedWorkout = {
  id: string;
  title: string;
  exercises: Exercise[];
  createdAt: string;
  updatedAt: string;
};

type WorkoutLibraryState = {
  workouts: SavedWorkout[];
  createWorkout: (title?: string) => string | null;
  updateWorkoutTitle: (id: string, title: string) => void;
  deleteWorkout: (id: string) => void;
  addExercise: (workoutId: string, exercise: Exercise) => void;
  updateExercise: (workoutId: string, exerciseIndex: number, exercise: Exercise) => void;
  removeExercise: (workoutId: string, exerciseIndex: number) => void;
  /** Link exercise at index with the one above into a superset (joins existing group if present). */
  linkWithPreviousAsSuperset: (workoutId: string, exerciseIndex: number) => void;
  unlinkSuperset: (workoutId: string, exerciseIndex: number) => void;
  applySessionProgress: (workoutId: string, sessionExercises: Exercise[]) => void;
  importFromLegacyTemplates: (
    templates: { id: string; title: string; exercises: Exercise[]; createdAt: string }[]
  ) => void;
  reset: () => void;
};

export const useWorkoutLibraryStore = create<WorkoutLibraryState>()((set, get) => ({
      workouts: [],

      createWorkout: (title = 'Workout') => {
        const tier = useSubscriptionStore.getState().tier;
        if (!canAddSavedWorkout(tier, get().workouts.length)) {
          return null;
        }

        const id = newId('sw');
        const now = new Date().toISOString();
        const workout: SavedWorkout = {
          id,
          title,
          exercises: [],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ workouts: [workout, ...s.workouts] }));
        scheduleTrackingRemoteSave();
        return id;
      },

      updateWorkoutTitle: (id, title) => {
        set((s) => ({
          workouts: s.workouts.map((w) =>
            w.id === id ? { ...w, title, updatedAt: new Date().toISOString() } : w
          ),
        }));
        scheduleTrackingRemoteSave();
      },

      deleteWorkout: (id) => {
        set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) }));
        void deleteRemoteWorkout(id);
        scheduleTrackingRemoteSave();
      },

      addExercise: (workoutId, exercise) => {
        const normalized = ensureExerciseSetRows(exercise);
        set((s) => ({
          workouts: s.workouts.map((w) =>
            w.id === workoutId
              ? {
                  ...w,
                  exercises: [...w.exercises, normalized],
                  updatedAt: new Date().toISOString(),
                }
              : w
          ),
        }));
        scheduleTrackingRemoteSave();
      },

      updateExercise: (workoutId, exerciseIndex, exercise) => {
        set((s) => ({
          workouts: s.workouts.map((w) => {
            if (w.id !== workoutId) return w;
            const exercises = [...w.exercises];
            exercises[exerciseIndex] = ensureExerciseSetRows(exercise);
            return { ...w, exercises, updatedAt: new Date().toISOString() };
          }),
        }));
        scheduleTrackingRemoteSave();
      },

      removeExercise: (workoutId, exerciseIndex) => {
        set((s) => ({
          workouts: s.workouts.map((w) => {
            if (w.id !== workoutId) return w;
            const exercises = cleanupSupersetGroups(
              w.exercises.filter((_, i) => i !== exerciseIndex)
            );
            return { ...w, exercises, updatedAt: new Date().toISOString() };
          }),
        }));
        scheduleTrackingRemoteSave();
      },

      linkWithPreviousAsSuperset: (workoutId, exerciseIndex) => {
        if (exerciseIndex <= 0) return;
        set((s) => ({
          workouts: s.workouts.map((w) => {
            if (w.id !== workoutId) return w;
            const prev = w.exercises[exerciseIndex - 1];
            const curr = w.exercises[exerciseIndex];
            if (!prev || !curr) return w;

            const prevId = prev.supersetGroupId?.trim();
            const currId = curr.supersetGroupId?.trim();
            const groupId = prevId || currId || newId('ss');
            const mergeIds = new Set(
              [prevId, currId].filter((id): id is string => Boolean(id))
            );

            const exercises = w.exercises.map((ex, i) => {
              const id = ex.supersetGroupId?.trim();
              if (i === exerciseIndex - 1 || i === exerciseIndex) {
                return { ...ex, supersetGroupId: groupId };
              }
              if (id && mergeIds.has(id)) {
                return { ...ex, supersetGroupId: groupId };
              }
              return ex;
            });
            return {
              ...w,
              exercises: cleanupSupersetGroups(exercises),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
        scheduleTrackingRemoteSave();
      },

      unlinkSuperset: (workoutId, exerciseIndex) => {
        set((s) => ({
          workouts: s.workouts.map((w) => {
            if (w.id !== workoutId) return w;
            const groupId = w.exercises[exerciseIndex]?.supersetGroupId?.trim();
            if (!groupId) return w;
            const exercises = cleanupSupersetGroups(
              w.exercises.map((ex) => {
                if (ex.supersetGroupId?.trim() !== groupId) return ex;
                const { supersetGroupId: _, ...rest } = ex;
                return rest;
              })
            );
            return { ...w, exercises, updatedAt: new Date().toISOString() };
          }),
        }));
        scheduleTrackingRemoteSave();
      },

      applySessionProgress: (workoutId, sessionExercises) => {
        set((s) => ({
          workouts: s.workouts.map((w) => {
            if (w.id !== workoutId) return w;
            const exercises = sessionExercises.map((sessionEx, ei) => {
              const savedEx = w.exercises[ei];
              const sess = ensureExerciseSetRows(sessionEx);
              if (!savedEx) {
                const setRows = (sess.setRows ?? []).map((row) => {
                  const loggedReps = row.actualReps?.trim();
                  const nextTargetReps =
                    loggedReps && /^\d+(\.\d+)?$/.test(loggedReps)
                      ? String(Math.round(Number(loggedReps)))
                      : row.targetReps;
                  return {
                    ...row,
                    id: newId('set'),
                    completed: false,
                    actualReps: undefined,
                    weightLb: row.weightLb,
                    targetReps: nextTargetReps,
                  };
                });
                return syncExerciseAggregateFromSetRows({
                  ...sess,
                  id: newId('ex'),
                  setRows,
                });
              }
              const saved = ensureExerciseSetRows(savedEx);
              const setRows = (saved.setRows ?? []).map((row, ri) => {
                const logged = sess.setRows?.[ri];
                if (!logged) return { ...row, completed: false, actualReps: undefined };
                const loggedReps = logged.actualReps?.trim();
                const loggedWeight = logged.weightLb;
                const nextTargetReps =
                  loggedReps && /^\d+(\.\d+)?$/.test(loggedReps)
                    ? String(Math.round(Number(loggedReps)))
                    : row.targetReps;
                return {
                  ...row,
                  completed: false,
                  actualReps: undefined,
                  weightLb: loggedWeight ?? row.weightLb,
                  targetReps: nextTargetReps,
                };
              });
              return syncExerciseAggregateFromSetRows({
                ...saved,
                setRows,
                notes: sess.notes ?? saved.notes,
                supersetGroupId: saved.supersetGroupId ?? sess.supersetGroupId,
              });
            });
            return { ...w, exercises, updatedAt: new Date().toISOString() };
          }),
        }));
        scheduleTrackingRemoteSave();
      },

      importFromLegacyTemplates: (templates) => {
        if (get().workouts.length > 0 || templates.length === 0) return;
        set({
          workouts: templates.map((t) => ({
            id: t.id,
            title: t.title,
            exercises: t.exercises.map((ex) => ensureExerciseSetRows(ex)),
            createdAt: t.createdAt,
            updatedAt: t.createdAt,
          })),
        });
        scheduleTrackingRemoteSave();
      },

      reset: () => set({ workouts: [] }),
}));
