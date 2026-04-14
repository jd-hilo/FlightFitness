import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { MacroTargets, Meal, WeekPlan, WorkoutDay } from '@/types/plan';

export type PlanState = {
  weekStart: string | null;
  macroTargets: MacroTargets | null;
  mealsByDay: Meal[][] | null;
  workoutsByDay: (WorkoutDay | null)[] | null;
  groceryList: { name: string; quantity?: string; category?: string }[] | null;
  lastGeneratedAt: string | null;
  setFromWeekPlan: (plan: WeekPlan) => void;
  updateDayMeals: (dayIndex: number, meals: Meal[]) => void;
  updateDayWorkout: (dayIndex: number, workout: WorkoutDay | null) => void;
  updateMeal: (dayIndex: number, mealId: string, meal: Meal) => void;
  updateExercise: (
    dayIndex: number,
    exerciseIndex: number,
    exercise: import('@/types/plan').Exercise
  ) => void;
  setMacroTargets: (t: MacroTargets) => void;
  clearPlan: () => void;
};

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      weekStart: null,
      macroTargets: null,
      mealsByDay: null,
      workoutsByDay: null,
      groceryList: null,
      lastGeneratedAt: null,
      setFromWeekPlan: (plan) =>
        set({
          weekStart: plan.weekStart,
          macroTargets: plan.macroTargets,
          mealsByDay: plan.mealsByDay,
          workoutsByDay: plan.workoutsByDay,
          groceryList: plan.groceryList,
          lastGeneratedAt: new Date().toISOString(),
        }),
      updateDayMeals: (dayIndex, meals) =>
        set((s) => {
          if (!s.mealsByDay) return s;
          const next = s.mealsByDay.map((d, i) => (i === dayIndex ? meals : d));
          return { mealsByDay: next };
        }),
      updateDayWorkout: (dayIndex, workout) =>
        set((s) => {
          if (!s.workoutsByDay) return s;
          const next = s.workoutsByDay.map((d, i) =>
            i === dayIndex ? workout : d
          );
          return { workoutsByDay: next };
        }),
      updateMeal: (dayIndex, mealId, meal) =>
        set((s) => {
          if (!s.mealsByDay) return s;
          const next = s.mealsByDay.map((day, i) => {
            if (i !== dayIndex) return day;
            return day.map((m) => (m.id === mealId ? meal : m));
          });
          return { mealsByDay: next };
        }),
      updateExercise: (dayIndex, exerciseIndex, exercise) =>
        set((s) => {
          if (!s.workoutsByDay) return s;
          const next = s.workoutsByDay.map((w, i) => {
            if (i !== dayIndex || !w) return w;
            const ex = [...w.exercises];
            ex[exerciseIndex] = exercise;
            return { ...w, exercises: ex };
          });
          return { workoutsByDay: next };
        }),
      setMacroTargets: (macroTargets) => set({ macroTargets }),
      clearPlan: () =>
        set({
          weekStart: null,
          macroTargets: null,
          mealsByDay: null,
          workoutsByDay: null,
          groceryList: null,
          lastGeneratedAt: null,
        }),
    }),
    {
      name: 'flight-plan',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export function useHasActivePlan() {
  return usePlanStore(
    (s) =>
      s.weekStart != null &&
      s.mealsByDay != null &&
      s.workoutsByDay != null &&
      s.macroTargets != null
  );
}
