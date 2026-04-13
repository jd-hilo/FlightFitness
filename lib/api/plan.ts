import { weekPlanSchema } from '@/types/plan';
import type { OnboardingAnswers, WeekPlan } from '@/types/plan';
import { buildMockWeekPlan } from '@/lib/mockPlan';
import { summarizeOnboardingForAI } from '@/lib/onboardingSummarize';
import {
  ensureSupabaseSession,
  supabase,
  supabaseConfigured,
} from '@/lib/supabase';

export type GeneratePlanBody = {
  onboarding: OnboardingAnswers;
  action?: 'full' | 'swapMeal' | 'regenerateDay' | 'adjustMacros' | 'swapExercise';
  swapMeal?: { dayIndex: number; slot: string; note?: string };
  regenerateDay?: { dayIndex: number };
  adjustMacros?: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  swapExercise?: { dayIndex: number; exerciseIndex: number; note?: string };
  currentPlan?: WeekPlan | null;
};

export async function generateWeekPlan(
  body: GeneratePlanBody
): Promise<{ ok: true; plan: WeekPlan } | { ok: false; error: string }> {
  if (!supabaseConfigured || !supabase) {
    const plan = buildMockWeekPlan(body.onboarding);
    const merged = applyCustomizationLocal(body, plan);
    const parsed = weekPlanSchema.safeParse(merged);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.message };
    }
    return { ok: true, plan: parsed.data };
  }

  const session = await ensureSupabaseSession();
  const token = session?.access_token;
  if (!token) {
    const anonPlan = buildMockWeekPlan(body.onboarding);
    const parsed = weekPlanSchema.safeParse(applyCustomizationLocal(body, anonPlan));
    if (!parsed.success) return { ok: false, error: parsed.error.message };
    return { ok: true, plan: parsed.data };
  }

  const fnUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-plan`;
  try {
    const payload = {
      ...body,
      onboardingSummary: summarizeOnboardingForAI(body.onboarding),
    };
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        error: typeof json?.error === 'string' ? json.error : 'Plan request failed',
      };
    }
    const parsed = weekPlanSchema.safeParse(json.plan ?? json);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid plan from server' };
    }
    return { ok: true, plan: parsed.data };
  } catch (e) {
    const plan = buildMockWeekPlan(body.onboarding);
    const parsed = weekPlanSchema.safeParse(applyCustomizationLocal(body, plan));
    if (!parsed.success) return { ok: false, error: String(e) };
    return { ok: true, plan: parsed.data };
  }
}

function applyCustomizationLocal(
  body: GeneratePlanBody,
  base: WeekPlan
): WeekPlan {
  let plan = { ...base, mealsByDay: base.mealsByDay.map((d) => [...d]) };
  if (body.action === 'adjustMacros' && body.adjustMacros) {
    plan = {
      ...plan,
      macroTargets: { ...body.adjustMacros },
    };
  }
  if (body.action === 'regenerateDay' && body.regenerateDay != null) {
    const i = body.regenerateDay.dayIndex;
    const fresh = buildMockWeekPlan(body.onboarding);
    const nextMeals = [...plan.mealsByDay];
    nextMeals[i] = fresh.mealsByDay[i]!.map((m, j) => ({
      ...m,
      id: `m-${i}-${j}-${Date.now()}`,
    }));
    plan = { ...plan, mealsByDay: nextMeals };
  }
  if (body.action === 'swapMeal' && body.swapMeal) {
    const i = body.swapMeal.dayIndex;
    const slot = body.swapMeal.slot;
    const nextMeals = plan.mealsByDay.map((day, di) => {
      if (di !== i) return day;
      return day.map((m) =>
        m.slot === slot
          ? {
              ...m,
              id: `${m.id}-swap-${Date.now()}`,
              name: 'Fresh swap meal',
              description:
                body.swapMeal?.note ||
                'AI-swapped meal — regenerate for full detail',
              macros: { ...m.macros, kcal: m.macros.kcal + 20 },
            }
          : m
      );
    });
    plan = { ...plan, mealsByDay: nextMeals };
  }
  if (body.action === 'swapExercise' && body.swapExercise) {
    const { dayIndex, exerciseIndex } = body.swapExercise;
    const w = plan.workoutsByDay[dayIndex];
    if (w?.exercises[exerciseIndex]) {
      const ex = [...w.exercises];
      ex[exerciseIndex] = {
        ...ex[exerciseIndex]!,
        id: `${ex[exerciseIndex]!.id}-swap`,
        name: 'Substitute movement',
        notes: body.swapExercise.note,
      };
      const wd = [...plan.workoutsByDay];
      wd[dayIndex] = { ...w, exercises: ex };
      plan = { ...plan, workoutsByDay: wd };
    }
  }
  return plan;
}
