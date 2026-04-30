import { supabase, supabaseConfigured } from '@/lib/supabase';
import { normalizeWeekPlanFromAI } from '@/lib/weekPlanAINormalize';
import { isRegisteredAppUser } from '@/lib/useRegisteredAuth';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { usePlanStore } from '@/stores/planStore';
import type { OnboardingAnswers } from '@/types/plan';
import { weekPlanSchema } from '@/types/plan';

type PersistedOnboardingJson = {
  answers?: Partial<OnboardingAnswers>;
  completedAt?: string | null;
  version?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function parseOnboardingJson(raw: unknown): PersistedOnboardingJson | null {
  if (!isRecord(raw)) return null;
  const answers = isRecord(raw.answers)
    ? (raw.answers as Partial<OnboardingAnswers>)
    : undefined;
  const completedAt =
    typeof raw.completedAt === 'string' && raw.completedAt.length > 0
      ? raw.completedAt
      : null;
  if (!answers && !completedAt) return null;
  return { answers, completedAt, version: 1 };
}

async function restoreLatestPlanIfPresent(userId: string): Promise<boolean> {
  if (!supabaseConfigured || !supabase) return false;
  const { data, error } = await supabase
    .from('plans')
    .select('payload')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data?.length) return false;
  const normalized = normalizeWeekPlanFromAI(data[0]?.payload);
  const parsed = weekPlanSchema.safeParse(normalized);
  if (!parsed.success) return false;

  usePlanStore.getState().setFromWeekPlan(parsed.data);
  return true;
}

export async function persistProfileOnboarding(
  answers: OnboardingAnswers,
  completedAt: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabaseConfigured || !supabase) {
    return { ok: false, error: 'Cloud is not configured on this device.' };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user?.id || !isRegisteredAppUser(user)) {
    return { ok: false, error: 'Not signed in.' };
  }

  const trimmedFirstName = answers.firstName.trim();
  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      first_name: trimmedFirstName.length > 0 ? trimmedFirstName : null,
      onboarding_json: {
        version: 1,
        completedAt,
        answers,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function pullProfileOnboardingIntoStore(): Promise<boolean> {
  if (!supabaseConfigured || !supabase) return false;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user?.id || !isRegisteredAppUser(user)) return false;

  const { data, error } = await supabase
    .from('profiles')
    .select('first_name, onboarding_json')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    if (__DEV__) console.warn('[pullProfileOnboardingIntoStore]', error.message);
    return false;
  }

  const remote = parseOnboardingJson(data?.onboarding_json);
  const firstName =
    typeof data?.first_name === 'string' ? data.first_name.trim() : '';

  if (remote?.answers) {
    useOnboardingStore.getState().setAnswers({
      ...remote.answers,
      firstName: firstName || remote.answers.firstName?.trim() || '',
    });
  } else if (firstName) {
    useOnboardingStore.getState().setAnswers({ firstName });
  }

  if (remote?.completedAt) {
    useOnboardingStore.setState({ completedAt: remote.completedAt });
    return true;
  }

  const restoredPlan = await restoreLatestPlanIfPresent(user.id);
  if (restoredPlan) {
    useOnboardingStore.setState({ completedAt: new Date().toISOString() });
    return true;
  }

  return false;
}
