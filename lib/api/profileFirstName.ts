import type { User } from '@supabase/supabase-js';

import { supabase, supabaseConfigured } from '@/lib/supabase';
import { isRegisteredAppUser } from '@/lib/useRegisteredAuth';
import { useOnboardingStore } from '@/stores/onboardingStore';

function firstWord(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0] ?? '';
}

function firstNameFromAuthUser(user: User): string {
  const meta = user.user_metadata ?? {};
  const fromMeta =
    firstWord(meta.given_name) ||
    firstWord(meta.givenName) ||
    firstWord(meta.full_name) ||
    firstWord(meta.name);
  if (fromMeta) return fromMeta;

  const apple = user.identities?.find((identity) => identity.provider === 'apple');
  const data = apple?.identity_data ?? {};
  return (
    firstWord(data.given_name) ||
    firstWord(data.givenName) ||
    firstWord(data.full_name) ||
    firstWord(data.name)
  );
}

/**
 * Loads `profiles.first_name` (or Apple/auth metadata) and fills the greeting
 * when the local first name is still empty.
 */
export async function pullProfileFirstNameIntoStore(): Promise<void> {
  if (!supabaseConfigured || !supabase) return;

  const current = useOnboardingStore.getState().answers.firstName.trim();
  if (current) return;

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
  }

  const remote =
    (typeof data?.first_name === 'string' ? data.first_name.trim() : '') ||
    firstNameFromAuthUser(user);
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
