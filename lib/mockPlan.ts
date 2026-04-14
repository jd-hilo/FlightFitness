import { formatYmdLocal } from '@/lib/weekUtils';
import type { OnboardingAnswers } from '@/types/plan';
import type { WeekPlan } from '@/types/plan';
import {
  DIET_MODIFIER_OPTIONS,
  DIET_PATTERN_OPTIONS,
  EQUIPMENT_OPTIONS,
  FOOD_PREFERENCE_OPTIONS,
} from '@/lib/onboardingOptions';

/** Rough maintenance estimate (Mifflin–St Jeor × 1.55 activity). */
function estimateMaintenanceKcal(a: OnboardingAnswers): number {
  const kg = a.currentWeightLb * 0.45359237;
  const cm = a.heightInches * 2.54;
  const age = Math.max(16, Math.min(90, a.ageYears));
  let bmr: number;
  if (a.sex === 'sex_man') {
    bmr = 10 * kg + 6.25 * cm - 5 * age + 5;
  } else if (a.sex === 'sex_woman') {
    bmr = 10 * kg + 6.25 * cm - 5 * age - 161;
  } else {
    const m = 10 * kg + 6.25 * cm - 5 * age + 5;
    const f = 10 * kg + 6.25 * cm - 5 * age - 161;
    bmr = (m + f) / 2;
  }
  return Math.round(Math.max(1200, bmr * 1.55));
}

function deficitForPace(a: OnboardingAnswers): number {
  switch (a.nutritionPaceId) {
    case 'pace_moderate':
      return 400;
    case 'pace_aggressive':
      return 550;
    case 'pace_not_tracking':
      return 150;
    case 'pace_sustainable':
    default:
      return 280;
  }
}

function mondayOfWeek(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  mon.setHours(12, 0, 0, 0);
  return formatYmdLocal(mon);
}

function dietSummary(a: OnboardingAnswers) {
  const parts: string[] = [];
  const p = DIET_PATTERN_OPTIONS.find((o) => o.id === a.dietPattern);
  if (p) parts.push(p.label);
  if (a.dietModifiers.length) {
    parts.push(
      ...a.dietModifiers.map(
        (id) => DIET_MODIFIER_OPTIONS.find((o) => o.id === id)?.label ?? id
      )
    );
  }
  if (a.foodPreferences.length) {
    parts.push(
      ...a.foodPreferences.map(
        (id) => FOOD_PREFERENCE_OPTIONS.find((o) => o.id === id)?.label ?? id
      )
    );
  }
  return parts.length ? parts.join(' · ') : 'Balanced';
}

function equipmentHint(ids: string[]) {
  if (ids.length === 0) return 'Standard gym';
  return ids
    .map((id) => EQUIPMENT_OPTIONS.find((o) => o.id === id)?.label ?? id)
    .join(', ');
}

export function buildMockWeekPlan(answers: OnboardingAnswers): WeekPlan {
  const weekStart = mondayOfWeek(new Date());
  const g = answers.goal;
  const deltaLb = answers.targetWeightLb - answers.currentWeightLb;

  const maintenance = estimateMaintenanceKcal(answers);
  let calories = maintenance;
  const wantsLose = g === 'lose_fat' || (deltaLb < -8 && g !== 'build_muscle');
  const wantsGain = g === 'build_muscle' && deltaLb > 8;
  const recomp = g === 'recomp';

  if (wantsLose && !wantsGain) {
    calories = maintenance - deficitForPace(answers);
    if (deltaLb < -20) calories -= 80;
  } else if (wantsGain && !wantsLose) {
    calories = maintenance + (deltaLb > 15 ? 380 : 280);
  } else if (recomp) {
    calories = maintenance - 120;
  }
  if (g === 'general_health') {
    calories = Math.min(calories, maintenance + 50);
  }
  if (g === 'performance') calories += 120;
  calories = Math.max(1500, Math.min(4000, Math.round(calories)));

  const proteinG = Math.round((calories * 0.3) / 4);
  const carbsG = Math.round((calories * 0.45) / 4);
  const fatG = Math.round((calories * 0.25) / 9);

  const dietStr = dietSummary(answers);
  const equipStr = equipmentHint(answers.equipment);

  const mealsByDay = Array.from({ length: 7 }, (_, dayIndex) => [
    {
      id: `m-${dayIndex}-b`,
      slot: 'breakfast' as const,
      name: 'Power Stack Breakfast',
      description: 'Eggs, oats, berries — aligned with your goals',
      recipe: 'Scramble 3 eggs; cook ½ cup oats; top with berries.',
      macros: {
        proteinG: 28,
        carbsG: 45,
        fatG: 14,
        kcal: 420,
      },
    },
    {
      id: `m-${dayIndex}-l`,
      slot: 'lunch' as const,
      name: 'Lean Fuel Bowl',
      description: `${dietStr} lunch · ${equipStr}`,
      recipe: 'Grill 6oz protein; 1 cup rice; 2 cups greens; light dressing.',
      macros: {
        proteinG: 48,
        carbsG: 55,
        fatG: 16,
        kcal: 580,
      },
    },
    {
      id: `m-${dayIndex}-d`,
      slot: 'dinner' as const,
      name: 'Recovery Plate',
      description: `Evening fuel · target trajectory ${answers.currentWeightLb}→${answers.targetWeightLb} lb`,
      recipe: 'Baked fish or chicken; roasted vegetables; olive oil.',
      macros: {
        proteinG: 42,
        carbsG: 40,
        fatG: 22,
        kcal: 540,
      },
    },
  ]);

  const pushPull = [
    {
      dayIndex: 0,
      title: 'Push — Chest & Shoulders',
      exercises: [
        {
          id: 'e0-0',
          name: 'Bench press',
          sets: 4,
          reps: '8-10',
          restSec: 120,
        },
        {
          id: 'e0-1',
          name: 'Overhead press',
          sets: 3,
          reps: '8-12',
          restSec: 90,
        },
        {
          id: 'e0-2',
          name: 'Lateral raise',
          sets: 3,
          reps: '12-15',
          restSec: 60,
        },
      ],
    },
    {
      dayIndex: 2,
      title: 'Pull — Back & Biceps',
      exercises: [
        {
          id: 'e2-0',
          name: 'Barbell row',
          sets: 4,
          reps: '8-10',
          restSec: 120,
        },
        {
          id: 'e2-1',
          name: 'Lat pulldown',
          sets: 3,
          reps: '10-12',
          restSec: 90,
        },
        {
          id: 'e2-2',
          name: 'Hammer curl',
          sets: 3,
          reps: '10-12',
          restSec: 60,
        },
      ],
    },
    {
      dayIndex: 4,
      title: 'Legs — Strength',
      exercises: [
        {
          id: 'e4-0',
          name: 'Back squat',
          sets: 4,
          reps: '6-8',
          restSec: 180,
        },
        {
          id: 'e4-1',
          name: 'Romanian deadlift',
          sets: 3,
          reps: '8-10',
          restSec: 120,
        },
        {
          id: 'e4-2',
          name: 'Walking lunge',
          sets: 3,
          reps: '10 each',
          restSec: 90,
        },
      ],
    },
  ];

  const workoutsByDay: (import('@/types/plan').WorkoutDay | null)[] =
    Array(7).fill(null);
  for (const w of pushPull) {
    workoutsByDay[w.dayIndex] = w;
  }

  const highFrequency =
    answers.trainingDaysPerWeek === 'six_sessions' ||
    answers.trainingDaysPerWeek === 'five_sessions';
  if (highFrequency) {
    workoutsByDay[1] = {
      dayIndex: 1,
      title: 'Conditioning & core',
      exercises: [
        {
          id: 'e1-0',
          name: 'Bike or row intervals',
          sets: 8,
          reps: '30s on / 60s off',
          restSec: 0,
        },
        {
          id: 'e1-1',
          name: 'Plank complex',
          sets: 3,
          reps: '45s',
          restSec: 45,
        },
      ],
    };
  }

  return {
    weekStart,
    macroTargets: {
      calories,
      proteinG,
      carbsG,
      fatG,
    },
    mealsByDay,
    workoutsByDay,
    groceryList: [
      { name: 'Eggs', quantity: '2 dozen', category: 'Dairy' },
      { name: 'Chicken breast', quantity: '3 lb', category: 'Protein' },
      { name: 'Oats', quantity: '1 container', category: 'Pantry' },
      { name: 'Berries', quantity: '2 packs', category: 'Produce' },
      { name: 'Rice', quantity: '2 lb', category: 'Pantry' },
      { name: 'Mixed greens', quantity: '3 bags', category: 'Produce' },
      { name: 'Olive oil', quantity: '1 bottle', category: 'Pantry' },
    ],
  };
}
