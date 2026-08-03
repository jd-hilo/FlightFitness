import type { WeekPlan } from "@/lib/flight/plan";

/** Minimal valid week plan for creating a row from the dashboard. */
export function emptyWeekPlan(weekStart: string): WeekPlan {
  const meal = (day: number, i: number) => ({
    id: `meal-${day}-${i}`,
    slot: "lunch" as const,
    name: "New meal",
    description: "",
    recipe: "",
    macros: { proteinG: 40, carbsG: 45, fatG: 15, kcal: 450 },
  });

  const mealsByDay = Array.from({ length: 7 }, (_, d) => [meal(d, 0)]);

  return {
    weekStart,
    macroTargets: {
      calories: 2200,
      proteinG: 160,
      carbsG: 220,
      fatG: 70,
    },
    mealsByDay,
    workoutsByDay: [null, null, null, null, null, null, null],
    groceryList: [],
  };
}
