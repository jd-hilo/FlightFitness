import { supabase, supabaseConfigured } from '@/lib/supabase';
import { isRegisteredAppUser } from '@/lib/useRegisteredAuth';
import { useOnboardingStore } from '@/stores/onboardingStore';

/**
 * Loads `profiles.first_name` for the signed-in user and merges into onboarding answers
 * when the server has a non-empty value (cross-device continuity).
 */
export async function pullProfileFirstNameIntoStore(): Promise<void> {
  if (!supabaseConfigured || !supabase) return;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user?.id || !isRegisteredAppUser(user)) return;

  const { data, error } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    if (__DEV__) console.warn('[pullProfileFirstNameIntoStore]', error.message);
    return;
  }

  const remote =
    typeof data?.first_name === 'string' ? data.first_name.trim() : '';
  if (!remote) return;

  useOnboardingStore.getState().setAnswers({ firstName: remote });
}

/**
 * Upserts the current user's `profiles.first_name` (null when empty).
 */
export async function persistProfileFirstName(
  raw: string
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

  const trimmed = raw.trim();
  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      first_name: trimmed.length > 0 ? trimmed : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
