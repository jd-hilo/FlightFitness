import { FunctionsHttpError } from '@supabase/supabase-js';

import { weekPlanSchema } from '@/types/plan';
import type { OnboardingAnswers, WeekPlan } from '@/types/plan';
import { buildMockWeekPlan } from '@/lib/mockPlan';
import { summarizeOnboardingForAI } from '@/lib/onboardingSummarize';
import {
  bootstrapAnonymousSession,
  ensureFreshSessionForEdge,
  supabase,
  supabaseConfigured,
} from '@/lib/supabase';
import { normalizeWeekPlanFromAI } from '@/lib/weekPlanAINormalize';

export type GeneratePlanBody = {
  onboarding: OnboardingAnswers;
  weekStartHint?: string;
  action?: 'full' | 'regenerateDay' | 'adjustMacros' | 'swapExercise';
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

export type GenerateWeekPlanResult =
  | { ok: true; plan: WeekPlan }
  | { ok: false; error: string };

let fullWeekPlanInFlight: Promise<GenerateWeekPlanResult> | null = null;

export async function generateWeekPlan(
  body: GeneratePlanBody
): Promise<GenerateWeekPlanResult> {
  const isFull = body.action == null || body.action === 'full';
  if (isFull && fullWeekPlanInFlight) return fullWeekPlanInFlight;

  const run = runGenerate(body);
  if (isFull) {
    fullWeekPlanInFlight = run.finally(() => {
      fullWeekPlanInFlight = null;
    });
    return fullWeekPlanInFlight;
  }
  return run;
}

async function runGenerate(
  body: GeneratePlanBody
): Promise<GenerateWeekPlanResult> {
  if (!supabaseConfigured || !supabase) {
    if (__DEV__) console.warn('[generateWeekPlan] Supabase env missing — mock');
    return mockResult(body);
  }

  try {
    await bootstrapAnonymousSession();
  } catch { /* best-effort */ }

  let session: Awaited<ReturnType<typeof ensureFreshSessionForEdge>> = null;
  try {
    session = await ensureFreshSessionForEdge();
  } catch { /* fallback to mock */ }

  const token = session?.access_token;
  if (!token) {
    if (__DEV__) console.warn('[generateWeekPlan] No JWT — mock');
    return mockResult(body);
  }

  if (__DEV__) console.log('[generateWeekPlan] invoke generate-plan');

  try {
    const edgePayload: Record<string, unknown> = {
      onboardingSummary: summarizeOnboardingForAI(body.onboarding),
      action: body.action ?? 'full',
    };
    if (body.weekStartHint) edgePayload.weekStartHint = body.weekStartHint;

    if (body.action === 'regenerateDay' && body.regenerateDay) {
      edgePayload.regenerateDay = body.regenerateDay;
      edgePayload.currentPlan = body.currentPlan;
    }
    if (body.action === 'adjustMacros' && body.adjustMacros) {
      edgePayload.adjustMacros = body.adjustMacros;
      edgePayload.currentPlan = body.currentPlan;
    }
    if (body.action === 'swapExercise' && body.swapExercise) {
      edgePayload.swapExercise = body.swapExercise;
      edgePayload.currentPlan = body.currentPlan;
    }

    const { data: json, error: fnError } = await supabase.functions.invoke(
      'generate-plan',
      {
        body: edgePayload,
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (fnError) {
      return { ok: false, error: extractFnError(fnError) };
    }

    const rawPlan =
      json && typeof json === 'object' && json !== null && 'plan' in json
        ? (json as { plan: unknown }).plan
        : json;

    const normalized = normalizeWeekPlanFromAI(rawPlan);
    const parsed = weekPlanSchema.safeParse(normalized);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const hint = issue
        ? `${issue.path.join('.') || 'plan'}: ${issue.message}`
        : parsed.error.message;
      if (__DEV__) console.warn('[generateWeekPlan] Zod:', parsed.error.flatten());
      return { ok: false, error: `Invalid plan from server — ${hint}` };
    }

    return { ok: true, plan: parsed.data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error:
        msg.includes('Network') || msg.includes('fetch')
          ? `Network error — ${msg}`
          : msg,
    };
  }
}

function mockResult(body: GeneratePlanBody): GenerateWeekPlanResult {
  const plan = buildMockWeekPlan(body.onboarding);
  const merged = applyCustomizationLocal(body, plan);
  const parsed = weekPlanSchema.safeParse(merged);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  return { ok: true, plan: parsed.data };
}

function extractFnError(fnError: unknown): string {
  if (fnError instanceof FunctionsHttpError) {
    const status = fnError.context.status;
    let msg = `Plan request failed (HTTP ${status})`;
    try {
      const bodyText = fnError.context.text
        ? String(fnError.context.text)
        : '';
      if (bodyText) {
        try {
          const errBody = JSON.parse(bodyText) as Record<string, unknown>;
          if (typeof errBody.error === 'string') {
            msg = `${errBody.error} (HTTP ${status})`;
            if (typeof errBody.detail === 'string') {
              msg += ` — ${errBody.detail}`;
            }
          } else {
            msg = `${msg} — ${bodyText.slice(0, 240)}`;
          }
        } catch {
          msg = `${msg} — ${bodyText.slice(0, 240)}`;
        }
      }
    } catch { /* ignore */ }
    if (__DEV__) console.warn('[generateWeekPlan] HTTP error', msg);
    return msg;
  }
  return fnError instanceof Error ? fnError.message : String(fnError);
}

function applyCustomizationLocal(
  body: GeneratePlanBody,
  base: WeekPlan
): WeekPlan {
  let plan = { ...base, mealsByDay: base.mealsByDay.map((d) => [...d]) };
  if (body.action === 'adjustMacros' && body.adjustMacros) {
    plan = { ...plan, macroTargets: { ...body.adjustMacros } };
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
