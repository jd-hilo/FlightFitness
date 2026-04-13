import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

type DayCompletion = {
  mealIds: string[];
  workoutDone: boolean;
  /** Exercise IDs completed for that calendar day (Train tab checkmarks). */
  exerciseIdsDone: string[];
};

function emptyDay(): DayCompletion {
  return { mealIds: [], workoutDone: false, exerciseIdsDone: [] };
}

export function normalizeDay(raw: Partial<DayCompletion> | undefined): DayCompletion {
  if (!raw) return emptyDay();
  return {
    mealIds: raw.mealIds ?? [],
    workoutDone: raw.workoutDone ?? false,
    exerciseIdsDone: raw.exerciseIdsDone ?? [],
  };
}

type CompletionState = {
  byDay: Record<string, DayCompletion>;
  streak: number;
  lastStreakIncrementDate: string | null;
  toggleMeal: (dateKey: string, mealId: string) => boolean;
  /** Pass all exercise IDs for this day when marking done so per-move checks stay in sync. */
  toggleWorkout: (dateKey: string, allExerciseIds?: string[]) => boolean;
  toggleExerciseDone: (dateKey: string, exerciseId: string) => void;
  setWorkoutDoneFlag: (dateKey: string, done: boolean) => void;
  /** If workout was completed before per-exercise tracking existed, mark all moves done. */
  backfillExerciseIdsIfWorkoutDone: (dateKey: string, allExerciseIds: string[]) => void;
  reset: () => void;
};

function bumpStreakIfNewDay(
  lastIncrement: string | null,
  streak: number,
  today: string
): { streak: number; lastStreakIncrementDate: string | null } {
  if (lastIncrement === today) {
    return { streak, lastStreakIncrementDate: lastIncrement };
  }
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = yesterday.toISOString().slice(0, 10);
  let next = streak;
  if (lastIncrement == null) {
    next = 1;
  } else if (lastIncrement === yKey) {
    next = streak + 1;
  } else if (lastIncrement !== today) {
    next = 1;
  }
  return { streak: next, lastStreakIncrementDate: today };
}

export const useCompletionStore = create<CompletionState>()(
  persist(
    (set, get) => ({
      byDay: {},
      streak: 0,
      lastStreakIncrementDate: null,
      toggleMeal: (dateKey, mealId) => {
        const day = normalizeDay(get().byDay[dateKey]);
        const has = day.mealIds.includes(mealId);
        const mealIds = has
          ? day.mealIds.filter((id) => id !== mealId)
          : [...day.mealIds, mealId];
        const nextDay = { ...day, mealIds };
        const today = todayKey();
        let streakUpdate: {
          streak: number;
          lastStreakIncrementDate: string | null;
        } = {
          streak: get().streak,
          lastStreakIncrementDate: get().lastStreakIncrementDate,
        };
        if (
          !has &&
          dateKey === today &&
          get().lastStreakIncrementDate !== today
        ) {
          streakUpdate = bumpStreakIfNewDay(
            get().lastStreakIncrementDate,
            get().streak,
            today
          );
        }
        set({
          byDay: { ...get().byDay, [dateKey]: nextDay },
          ...streakUpdate,
        });
        return !has;
      },
      toggleWorkout: (dateKey, allExerciseIds) => {
        const day = normalizeDay(get().byDay[dateKey]);
        const nextDone = !day.workoutDone;
        let exerciseIdsDone = day.exerciseIdsDone;
        if (!nextDone) {
          exerciseIdsDone = [];
        } else if (allExerciseIds?.length) {
          exerciseIdsDone = [...allExerciseIds];
        }
        const nextDay = { ...day, workoutDone: nextDone, exerciseIdsDone };
        const today = todayKey();
        let streakUpdate: {
          streak: number;
          lastStreakIncrementDate: string | null;
        } = {
          streak: get().streak,
          lastStreakIncrementDate: get().lastStreakIncrementDate,
        };
        if (
          nextDone &&
          dateKey === today &&
          get().lastStreakIncrementDate !== today
        ) {
          streakUpdate = bumpStreakIfNewDay(
            get().lastStreakIncrementDate,
            get().streak,
            today
          );
        }
        set({
          byDay: { ...get().byDay, [dateKey]: nextDay },
          ...streakUpdate,
        });
        return nextDone;
      },
      toggleExerciseDone: (dateKey, exerciseId) => {
        const day = normalizeDay(get().byDay[dateKey]);
        const has = day.exerciseIdsDone.includes(exerciseId);
        const exerciseIdsDone = has
          ? day.exerciseIdsDone.filter((id) => id !== exerciseId)
          : [...day.exerciseIdsDone, exerciseId];
        set({
          byDay: {
            ...get().byDay,
            [dateKey]: { ...day, exerciseIdsDone },
          },
        });
      },
      backfillExerciseIdsIfWorkoutDone: (dateKey, allExerciseIds) => {
        if (!allExerciseIds.length) return;
        const day = normalizeDay(get().byDay[dateKey]);
        if (!day.workoutDone || day.exerciseIdsDone.length > 0) return;
        set({
          byDay: {
            ...get().byDay,
            [dateKey]: { ...day, exerciseIdsDone: [...allExerciseIds] },
          },
        });
      },
      setWorkoutDoneFlag: (dateKey, done) => {
        const day = normalizeDay(get().byDay[dateKey]);
        if (day.workoutDone === done) return;
        const nextDay = { ...day, workoutDone: done };
        const today = todayKey();
        let streakUpdate: {
          streak: number;
          lastStreakIncrementDate: string | null;
        } = {
          streak: get().streak,
          lastStreakIncrementDate: get().lastStreakIncrementDate,
        };
        if (
          done &&
          dateKey === today &&
          get().lastStreakIncrementDate !== today
        ) {
          streakUpdate = bumpStreakIfNewDay(
            get().lastStreakIncrementDate,
            get().streak,
            today
          );
        }
        set({
          byDay: { ...get().byDay, [dateKey]: nextDay },
          ...streakUpdate,
        });
      },
      reset: () =>
        set({ byDay: {}, streak: 0, lastStreakIncrementDate: null }),
    }),
    {
      name: 'flight-completion',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
