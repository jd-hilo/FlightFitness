import { generateWeekPlan } from '@/lib/api/plan';
import { localPlanCoversWeek } from '@/lib/planCompleteness';
import {
  ensureFreshSessionForEdge,
  supabase,
  supabaseConfigured,
} from '@/lib/supabase';
import { viewWeekStartYmdLocal } from '@/lib/weekUtils';
import { normalizeWeekPlanFromAI } from '@/lib/weekPlanAINormalize';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { usePlanStore } from '@/stores/planStore';
import { usePlanWeekEnsureStore } from '@/stores/planWeekEnsureStore';
import {
  shouldAllowAiFullWeekGeneration,
  useSubscriptionStore,
} from '@/stores/subscriptionStore';
import { weekPlanSchema, type OnboardingAnswers, type WeekPlan } from '@/types/plan';

export type EnsureResult =
  | 'local_ok'
  | 'restored_remote'
  | 'generated'
  | 'skipped_no_session'
  | 'skipped_ai_not_entitled'
  | 'generate_failed';

let ensureInFlight: Promise<EnsureResult> | null = null;

function parseRemotePayload(raw: unknown): WeekPlan | null {
  const normalized = normalizeWeekPlanFromAI(raw);
  const parsed = weekPlanSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}

async function fetchSavedPlanForWeek(
  weekStart: string
): Promise<WeekPlan | null> {
  if (!supabaseConfigured || !supabase) return null;
  const session = await ensureFreshSessionForEdge();
  const uid = session?.user?.id;
  if (!uid) return null;

  const { data, error } = await supabase
    .from('plans')
    .select('payload')
    .eq('user_id', uid)
    .eq('week_start', weekStart)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data?.length) return null;
  return parseRemotePayload(data[0]?.payload);
}

async function runEnsure(): Promise<EnsureResult> {
  const target = viewWeekStartYmdLocal();

  if (localPlanCoversWeek(usePlanStore.getState(), target)) {
    return 'local_ok';
  }

  const setEnsuring = usePlanWeekEnsureStore.getState().setInProgress;
  setEnsuring(true);
  try {
    if (!supabaseConfigured || !supabase) return 'skipped_no_session';

    const session = await ensureFreshSessionForEdge();
    if (!session?.access_token) return 'skipped_no_session';

    if (localPlanCoversWeek(usePlanStore.getState(), target)) {
      return 'local_ok';
    }

    const remote = await fetchSavedPlanForWeek(target);
    if (remote) {
      usePlanStore.getState().setFromWeekPlan(remote);
      return 'restored_remote';
    }

    if (localPlanCoversWeek(usePlanStore.getState(), target)) {
      return 'local_ok';
    }

    if (!shouldAllowAiFullWeekGeneration()) {
      if (__DEV__) {
        console.warn(
          '[ensureCurrentWeekPlan] skip AI full-week gen (tier / free trial)'
        );
      }
      return 'skipped_ai_not_entitled';
    }

    const onboarding = useOnboardingStore.getState().answers as OnboardingAnswers;
    const res = await generateWeekPlan({
      onboarding,
      action: 'full',
      weekStartHint: target,
    });

    if (!res.ok) {
      if (__DEV__) console.warn('[ensureCurrentWeekPlan]', res.error);
      return 'generate_failed';
    }

    usePlanStore.getState().setFromWeekPlan(res.plan);
    useSubscriptionStore.getState().consumeFreeAiWeekAfterFullGenerateIfNeeded();
    return 'generated';
  } finally {
    setEnsuring(false);
  }
}

/**
 * Ensure the current calendar week has a full 7-day plan.
 * Priority: local store → Supabase DB → one full generation.
 * Deduped: only one in-flight run at a time.
 */
export function ensureCurrentWeekPlan(): Promise<EnsureResult> {
  if (ensureInFlight) return ensureInFlight;
  ensureInFlight = runEnsure().finally(() => {
    ensureInFlight = null;
  });
  return ensureInFlight;
}
