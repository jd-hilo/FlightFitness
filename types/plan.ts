import { z } from 'zod';

export const verseTagSchema = z.enum([
  'motivation',
  'discipline',
  'strength',
  'gratitude',
]);
export type VerseTag = z.infer<typeof verseTagSchema>;

export const mealSlotSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
export type MealSlot = z.infer<typeof mealSlotSchema>;

export const macrosSchema = z.object({
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  kcal: z.number(),
});

export const mealSchema = z.object({
  id: z.string(),
  slot: mealSlotSchema,
  name: z.string(),
  description: z.string(),
  recipe: z.string().optional(),
  macros: macrosSchema,
  imageKeyword: z.string().optional(),
});

export const exerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  sets: z.number(),
  reps: z.string(),
  restSec: z.number(),
  notes: z.string().optional(),
});

export const workoutDaySchema = z.object({
  dayIndex: z.number().min(0).max(6),
  title: z.string(),
  exercises: z.array(exerciseSchema),
});

export const groceryItemSchema = z.object({
  name: z.string(),
  quantity: z.string().optional(),
  category: z.string().optional(),
});

export const macroTargetsSchema = z.object({
  calories: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
});

export const weekPlanSchema = z.object({
  weekStart: z.string(),
  macroTargets: macroTargetsSchema,
  mealsByDay: z.array(z.array(mealSchema)).length(7),
  workoutsByDay: z.array(workoutDaySchema.nullable()).length(7),
  groceryList: z.array(groceryItemSchema),
});

export type Meal = z.infer<typeof mealSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type WorkoutDay = z.infer<typeof workoutDaySchema>;
export type GroceryItem = z.infer<typeof groceryItemSchema>;
export type MacroTargets = z.infer<typeof macroTargetsSchema>;
export type WeekPlan = z.infer<typeof weekPlanSchema>;

export type OnboardingAnswers = {
  /** Single primary goal id. */
  goal: string;
  /** Single experience tier id. */
  experience: string;
  equipment: string[];
  /** Exactly one base eating pattern (omnivore, vegan, etc.). */
  dietPattern: string;
  /** Add-on modifiers; max 5 in UI (protein, halal, GF, etc.). */
  dietModifiers: string[];
  /** Dislikes & cuisine lean; max 5 in UI. */
  foodPreferences: string[];
  /** Single: 2–3 / 4 / 5 / 6 training days per week. */
  trainingDaysPerWeek: string;
  /**
   * Time prefs: max 2 of morning/midday/evening, OR flexible_training alone.
   * weekend_heavy can stack on top.
   */
  trainingTimePrefs: string[];
  currentWeightLb: number;
  targetWeightLb: number;
};
