import { usePlanStore } from '@/stores/planStore';
import type { WeekPlan } from '@/types/plan';

export function getWeekPlanFromStore(): WeekPlan | null {
  const s = usePlanStore.getState();
  if (
    !s.weekStart ||
    !s.macroTargets ||
    !s.mealsByDay ||
    !s.workoutsByDay ||
    !s.groceryList
  ) {
    return null;
  }
  return {
    weekStart: s.weekStart,
    macroTargets: s.macroTargets,
    mealsByDay: s.mealsByDay,
    workoutsByDay: s.workoutsByDay,
    groceryList: s.groceryList,
  };
}
