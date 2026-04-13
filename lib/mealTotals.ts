import type { Meal } from '@/types/plan';

export function sumMacrosForMeals(meals: Meal[]) {
  return meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.macros.kcal,
      proteinG: acc.proteinG + m.macros.proteinG,
      carbsG: acc.carbsG + m.macros.carbsG,
      fatG: acc.fatG + m.macros.fatG,
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );
}
