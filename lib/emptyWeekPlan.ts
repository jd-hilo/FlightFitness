import { viewWeekStartYmdLocal } from '@/lib/weekUtils';
import type { WeekPlan } from '@/types/plan';

/** Minimal valid week shell for manual-first plan building. */
export function emptyWeekPlan(weekStart?: string): WeekPlan {
  const start = weekStart ?? viewWeekStartYmdLocal();
  return {
    weekStart: start,
    macroTargets: {
      calories: 2200,
      proteinG: 160,
      carbsG: 220,
      fatG: 70,
    },
    mealsByDay: [[], [], [], [], [], [], []],
    workoutsByDay: [null, null, null, null, null, null, null],
    groceryList: [],
  };
}
