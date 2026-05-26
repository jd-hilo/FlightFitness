import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { scheduleRemotePlanSave } from '@/lib/api/planPersistence';
import { emptyWeekPlan } from '@/lib/emptyWeekPlan';
import {
  defaultSetRow,
  ensureExerciseSetRows,
  newId,
  syncExerciseAggregateFromSetRows,
} from '@/lib/exerciseNormalize';
import { viewWeekStartYmdLocal } from '@/lib/weekUtils';
import {
  canAddSavedMealTemplate,
  FREE_TIER_MAX_SAVED_MEALS,
  hasPremiumLibraryAccess,
  useSubscriptionStore,
} from '@/stores/subscriptionStore';
import type {
  Exercise,
  ExerciseSetRow,
  MacroTargets,
  Meal,
  MealTemplate,
  WeekPlan,
  WorkoutDay,
  WorkoutTemplate,
} from '@/types/plan';

export type PlanState = {
  weekStart: string | null;
  macroTargets: MacroTargets | null;
  mealsByDay: Meal[][] | null;
  workoutsByDay: (WorkoutDay | null)[] | null;
  groceryList: { name: string; quantity?: string; category?: string }[] | null;
  lastGeneratedAt: string | null;
  workoutTemplates: WorkoutTemplate[];
  mealTemplates: MealTemplate[];
  setFromWeekPlan: (plan: WeekPlan) => void;
  ensureWeekPlanShell: (weekStart?: string) => void;
  updateDayMeals: (dayIndex: number, meals: Meal[]) => void;
  updateDayWorkout: (dayIndex: number, workout: WorkoutDay | null) => void;
  createWorkoutDay: (dayIndex: number, title?: string) => void;
  updateWorkoutTitle: (dayIndex: number, title: string) => void;
  addExercise: (dayIndex: number, exercise: Exercise) => void;
  removeExercise: (dayIndex: number, exerciseIndex: number) => void;
  updateMeal: (dayIndex: number, mealId: string, meal: Meal) => void;
  addMeal: (dayIndex: number, meal: Meal) => void;
  removeMeal: (dayIndex: number, mealId: string) => void;
  updateExercise: (
    dayIndex: number,
    exerciseIndex: number,
    exercise: Exercise
  ) => void;
  addExerciseSetRow: (
    dayIndex: number,
    exerciseIndex: number,
    row?: Partial<ExerciseSetRow>
  ) => void;
  removeExerciseSetRow: (
    dayIndex: number,
    exerciseIndex: number,
    setRowIndex: number
  ) => void;
  updateExerciseSetRow: (
    dayIndex: number,
    exerciseIndex: number,
    setRowIndex: number,
    patch: Partial<ExerciseSetRow>
  ) => void;
  saveWorkoutTemplate: (dayIndex: number, title?: string) => void;
  applyWorkoutTemplate: (dayIndex: number, templateId: string) => void;
  saveMealTemplate: (meal: Meal) => boolean;
  setMacroTargets: (t: MacroTargets) => void;
  clearPlan: () => void;
};

function cloneExerciseForTemplate(ex: Exercise): Exercise {
  const base = ensureExerciseSetRows(ex);
  return {
    ...base,
    id: newId('ex'),
    setRows: base.setRows?.map((row) => ({
      ...row,
      id: newId('set'),
      completed: false,
      actualReps: undefined,
    })),
  };
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      weekStart: null,
      macroTargets: null,
      mealsByDay: null,
      workoutsByDay: null,
      groceryList: null,
      lastGeneratedAt: null,
      workoutTemplates: [],
      mealTemplates: [],

      setFromWeekPlan: (plan) => {
        set({
          weekStart: plan.weekStart,
          macroTargets: plan.macroTargets,
          mealsByDay: plan.mealsByDay,
          workoutsByDay: plan.workoutsByDay.map((w) =>
            w
              ? {
                  ...w,
                  exercises: w.exercises.map((ex) => ensureExerciseSetRows(ex)),
                }
              : null
          ),
          groceryList: plan.groceryList,
          lastGeneratedAt: new Date().toISOString(),
        });
      },

      ensureWeekPlanShell: (weekStart) => {
        const target = weekStart ?? viewWeekStartYmdLocal();
        const s = get();
        if (
          s.weekStart === target &&
          s.mealsByDay &&
          s.workoutsByDay &&
          s.macroTargets &&
          s.groceryList
        ) {
          return;
        }
        const shell = emptyWeekPlan(target);
        set({
          weekStart: shell.weekStart,
          macroTargets: shell.macroTargets,
          mealsByDay: shell.mealsByDay,
          workoutsByDay: shell.workoutsByDay,
          groceryList: shell.groceryList,
        });
        scheduleRemotePlanSave();
      },

      updateDayMeals: (dayIndex, meals) => {
        set((s) => {
          if (!s.mealsByDay) return s;
          const next = s.mealsByDay.map((d, i) => (i === dayIndex ? meals : d));
          return { mealsByDay: next };
        });
        scheduleRemotePlanSave();
      },

      updateDayWorkout: (dayIndex, workout) => {
        set((s) => {
          if (!s.workoutsByDay) return s;
          const next = s.workoutsByDay.map((d, i) =>
            i === dayIndex
              ? workout
                ? {
                    ...workout,
                    exercises: workout.exercises.map((ex) => ensureExerciseSetRows(ex)),
                  }
                : null
              : d
          );
          return { workoutsByDay: next };
        });
        scheduleRemotePlanSave();
      },

      createWorkoutDay: (dayIndex, title = 'Training') => {
        get().ensureWeekPlanShell();
        const workout: WorkoutDay = {
          dayIndex,
          title,
          exercises: [],
        };
        get().updateDayWorkout(dayIndex, workout);
      },

      updateWorkoutTitle: (dayIndex, title) => {
        set((s) => {
          if (!s.workoutsByDay) return s;
          const next = s.workoutsByDay.map((w, i) =>
            i === dayIndex && w ? { ...w, title } : w
          );
          return { workoutsByDay: next };
        });
        scheduleRemotePlanSave();
      },

      addExercise: (dayIndex, exercise) => {
        get().ensureWeekPlanShell();
        const normalized = syncExerciseAggregateFromSetRows(
          ensureExerciseSetRows(exercise)
        );
        set((s) => {
          if (!s.workoutsByDay) return s;
          const next = s.workoutsByDay.map((w, i) => {
            if (i !== dayIndex) return w;
            const base =
              w ??
              ({
                dayIndex,
                title: 'Training',
                exercises: [],
              } satisfies WorkoutDay);
            return {
              ...base,
              exercises: [...base.exercises, normalized],
            };
          });
          return { workoutsByDay: next };
        });
        scheduleRemotePlanSave();
      },

      removeExercise: (dayIndex, exerciseIndex) => {
        set((s) => {
          if (!s.workoutsByDay) return s;
          const next = s.workoutsByDay.map((w, i) => {
            if (i !== dayIndex || !w) return w;
            const exercises = w.exercises.filter((_, j) => j !== exerciseIndex);
            return exercises.length ? { ...w, exercises } : null;
          });
          return { workoutsByDay: next };
        });
        scheduleRemotePlanSave();
      },

      updateMeal: (dayIndex, mealId, meal) => {
        set((s) => {
          if (!s.mealsByDay) return s;
          const next = s.mealsByDay.map((day, i) => {
            if (i !== dayIndex) return day;
            return day.map((m) => (m.id === mealId ? meal : m));
          });
          return { mealsByDay: next };
        });
        scheduleRemotePlanSave();
      },

      addMeal: (dayIndex, meal) => {
        get().ensureWeekPlanShell();
        set((s) => {
          if (!s.mealsByDay) return s;
          const next = s.mealsByDay.map((day, i) =>
            i === dayIndex ? [...day, meal] : day
          );
          return { mealsByDay: next };
        });
        scheduleRemotePlanSave();
      },

      removeMeal: (dayIndex, mealId) => {
        set((s) => {
          if (!s.mealsByDay) return s;
          const next = s.mealsByDay.map((day, i) =>
            i === dayIndex ? day.filter((m) => m.id !== mealId) : day
          );
          return { mealsByDay: next };
        });
        scheduleRemotePlanSave();
      },

      updateExercise: (dayIndex, exerciseIndex, exercise) => {
        set((s) => {
          if (!s.workoutsByDay) return s;
          const next = s.workoutsByDay.map((w, i) => {
            if (i !== dayIndex || !w) return w;
            const ex = [...w.exercises];
            ex[exerciseIndex] = syncExerciseAggregateFromSetRows(
              ensureExerciseSetRows(exercise)
            );
            return { ...w, exercises: ex };
          });
          return { workoutsByDay: next };
        });
        scheduleRemotePlanSave();
      },

      addExerciseSetRow: (dayIndex, exerciseIndex, row) => {
        set((s) => {
          if (!s.workoutsByDay) return s;
          const next = s.workoutsByDay.map((w, i) => {
            if (i !== dayIndex || !w) return w;
            const ex = [...w.exercises];
            const current = ensureExerciseSetRows(ex[exerciseIndex]!);
            const reps = current.reps || '8-10';
            const restSec = current.restSec ?? 60;
            const newRow = defaultSetRow(
              row?.targetReps ?? reps,
              row?.restSec ?? restSec,
              row?.id
            );
            ex[exerciseIndex] = syncExerciseAggregateFromSetRows({
              ...current,
              setRows: [...(current.setRows ?? []), { ...newRow, ...row }],
            });
            return { ...w, exercises: ex };
          });
          return { workoutsByDay: next };
        });
        scheduleRemotePlanSave();
      },

      removeExerciseSetRow: (dayIndex, exerciseIndex, setRowIndex) => {
        set((s) => {
          if (!s.workoutsByDay) return s;
          const next = s.workoutsByDay.map((w, i) => {
            if (i !== dayIndex || !w) return w;
            const ex = [...w.exercises];
            const current = ensureExerciseSetRows(ex[exerciseIndex]!);
            const rows = (current.setRows ?? []).filter((_, j) => j !== setRowIndex);
            if (rows.length === 0) return w;
            ex[exerciseIndex] = syncExerciseAggregateFromSetRows({
              ...current,
              setRows: rows,
            });
            return { ...w, exercises: ex };
          });
          return { workoutsByDay: next };
        });
        scheduleRemotePlanSave();
      },

      updateExerciseSetRow: (dayIndex, exerciseIndex, setRowIndex, patch) => {
        set((s) => {
          if (!s.workoutsByDay) return s;
          const next = s.workoutsByDay.map((w, i) => {
            if (i !== dayIndex || !w) return w;
            const ex = [...w.exercises];
            const current = ensureExerciseSetRows(ex[exerciseIndex]!);
            const rows = (current.setRows ?? []).map((row, j) =>
              j === setRowIndex ? { ...row, ...patch } : row
            );
            ex[exerciseIndex] = syncExerciseAggregateFromSetRows({
              ...current,
              setRows: rows,
            });
            return { ...w, exercises: ex };
          });
          return { workoutsByDay: next };
        });
        scheduleRemotePlanSave();
      },

      saveWorkoutTemplate: (dayIndex, title) => {
        const w = get().workoutsByDay?.[dayIndex];
        if (!w || w.exercises.length === 0) return;
        const template: WorkoutTemplate = {
          id: newId('wt'),
          title: title ?? w.title,
          exercises: w.exercises.map(cloneExerciseForTemplate),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          workoutTemplates: [template, ...s.workoutTemplates].slice(0, 24),
        }));
      },

      applyWorkoutTemplate: (dayIndex, templateId) => {
        const template = get().workoutTemplates.find((t) => t.id === templateId);
        if (!template) return;
        get().ensureWeekPlanShell();
        get().updateDayWorkout(dayIndex, {
          dayIndex,
          title: template.title,
          exercises: template.exercises.map(cloneExerciseForTemplate),
        });
      },

      saveMealTemplate: (meal) => {
        const s = get();
        const tier = useSubscriptionStore.getState().tier;
        if (!canAddSavedMealTemplate(tier, s.mealTemplates, meal.name)) {
          return false;
        }

        const template: MealTemplate = {
          id: newId('mt'),
          slot: meal.slot,
          name: meal.name,
          description: meal.description,
          recipe: meal.recipe,
          macros: { ...meal.macros },
          createdAt: new Date().toISOString(),
        };
        const key = meal.name.trim().toLowerCase();
        const next = [
          template,
          ...s.mealTemplates.filter((t) => t.name.trim().toLowerCase() !== key),
        ];
        const capped = hasPremiumLibraryAccess(tier)
          ? next
          : next.slice(0, FREE_TIER_MAX_SAVED_MEALS);
        set({ mealTemplates: capped });
        scheduleRemotePlanSave();
        return true;
      },

      setMacroTargets: (macroTargets) => {
        set({ macroTargets });
        scheduleRemotePlanSave();
      },

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
      partialize: (s) => ({
        weekStart: s.weekStart,
        macroTargets: s.macroTargets,
        mealsByDay: s.mealsByDay,
        workoutsByDay: s.workoutsByDay,
        groceryList: s.groceryList,
        lastGeneratedAt: s.lastGeneratedAt,
        workoutTemplates: s.workoutTemplates,
        mealTemplates: s.mealTemplates,
      }),
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

export function useHasPlanShell() {
  return usePlanStore(
    (s) =>
      s.weekStart != null &&
      s.mealsByDay != null &&
      s.workoutsByDay != null &&
      s.macroTargets != null &&
      s.groceryList != null
  );
}
