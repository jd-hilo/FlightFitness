import type { PlanState } from '@/stores/planStore';

/** True when arrays are length 7 and every day has at least one meal. */
export function isPlanWeekDataComplete(s: {
  mealsByDay: unknown;
  workoutsByDay: unknown;
  macroTargets: unknown;
}): boolean {
  if (!s.macroTargets || typeof s.macroTargets !== 'object') return false;
  const meals = s.mealsByDay;
  const w = s.workoutsByDay;
  if (!Array.isArray(meals) || meals.length !== 7) return false;
  if (!Array.isArray(w) || w.length !== 7) return false;
  for (let i = 0; i < 7; i++) {
    const day = meals[i];
    if (!Array.isArray(day) || day.length < 1) return false;
  }
  return true;
}

export function localPlanCoversWeek(
  state: Pick<
    PlanState,
    'weekStart' | 'mealsByDay' | 'workoutsByDay' | 'macroTargets' | 'groceryList'
  >,
  targetWeekStartYmd: string
): boolean {
  return (
    state.weekStart === targetWeekStartYmd &&
    state.groceryList != null &&
    isPlanWeekDataComplete(state)
  );
}
