import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ensureExerciseSetRows, newId, syncExerciseAggregateFromSetRows } from '@/lib/exerciseNormalize';
import { deleteRemoteWorkout, scheduleTrackingRemoteSave } from '@/lib/api/trackingPersistence';
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
  createWorkout: (title?: string) => string;
  updateWorkoutTitle: (id: string, title: string) => void;
  deleteWorkout: (id: string) => void;
  addExercise: (workoutId: string, exercise: Exercise) => void;
  updateExercise: (workoutId: string, exerciseIndex: number, exercise: Exercise) => void;
  removeExercise: (workoutId: string, exerciseIndex: number) => void;
  applySessionProgress: (workoutId: string, sessionExercises: Exercise[]) => void;
  importFromLegacyTemplates: (
    templates: { id: string; title: string; exercises: Exercise[]; createdAt: string }[]
  ) => void;
};

export const useWorkoutLibraryStore = create<WorkoutLibraryState>()(
  persist(
    (set, get) => ({
      workouts: [],

      createWorkout: (title = 'Workout') => {
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
          workouts: s.workouts.map((w) =>
            w.id === workoutId
              ? {
                  ...w,
                  exercises: w.exercises.filter((_, i) => i !== exerciseIndex),
                  updatedAt: new Date().toISOString(),
                }
              : w
          ),
        }));
        scheduleTrackingRemoteSave();
      },

      applySessionProgress: (workoutId, sessionExercises) => {
        set((s) => ({
          workouts: s.workouts.map((w) => {
            if (w.id !== workoutId) return w;
            const exercises = w.exercises.map((savedEx, ei) => {
              const sessionEx = sessionExercises[ei];
              if (!sessionEx) return savedEx;
              const saved = ensureExerciseSetRows(savedEx);
              const sess = ensureExerciseSetRows(sessionEx);
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
              return syncExerciseAggregateFromSetRows({ ...saved, setRows });
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
    }),
    {
      name: 'flight-workout-library',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
