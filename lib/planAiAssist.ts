import { upsertWeekPlan } from '@/lib/api/planPersistence';
import { generateWeekPlan } from '@/lib/api/plan';
import { getWeekPlanFromStore } from '@/lib/planFromStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { usePlanStore } from '@/stores/planStore';
import type { OnboardingAnswers, WeekPlan } from '@/types/plan';

export type AiAssistResult =
  | { ok: true; plan: WeekPlan }
  | { ok: false; error: string };

async function runAssist(
  body: Parameters<typeof generateWeekPlan>[0]
): Promise<AiAssistResult> {
  const res = await generateWeekPlan(body);
  if (!res.ok) return res;
  usePlanStore.getState().setFromWeekPlan(res.plan);
  await upsertWeekPlan(res.plan);
  return { ok: true, plan: res.plan };
}

export async function aiSwapExercise(
  dayIndex: number,
  exerciseIndex: number,
  note?: string
): Promise<AiAssistResult> {
  const currentPlan = getWeekPlanFromStore();
  if (!currentPlan) return { ok: false, error: 'No plan loaded' };
  const onboarding = useOnboardingStore.getState().answers as OnboardingAnswers;
  return runAssist({
    onboarding,
    action: 'swapExercise',
    swapExercise: { dayIndex, exerciseIndex, note },
    currentPlan,
  });
}

export async function aiRegenerateDay(dayIndex: number): Promise<AiAssistResult> {
  const currentPlan = getWeekPlanFromStore();
  if (!currentPlan) return { ok: false, error: 'No plan loaded' };
  const onboarding = useOnboardingStore.getState().answers as OnboardingAnswers;
  return runAssist({
    onboarding,
    action: 'regenerateDay',
    regenerateDay: { dayIndex },
    currentPlan,
    weekStartHint: currentPlan.weekStart,
  });
}

export async function aiGenerateFullWeek(weekStartHint: string): Promise<AiAssistResult> {
  const onboarding = useOnboardingStore.getState().answers as OnboardingAnswers;
  return runAssist({
    onboarding,
    action: 'full',
    weekStartHint,
  });
}
