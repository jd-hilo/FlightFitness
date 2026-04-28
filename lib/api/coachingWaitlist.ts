import { ensureFreshSessionForEdge, supabase, supabaseConfigured } from '@/lib/supabase';

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  if (email.length < 3 || email.length > 320) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export type SubmitWaitlistResult =
  | { ok: true; alreadyListed?: boolean }
  | { ok: false; error: string };

/**
 * Inserts into `coaching_waitlist`. Requires Supabase session (anonymous is fine).
 */
export async function submitCoachingWaitlist(emailRaw: string): Promise<SubmitWaitlistResult> {
  if (!supabaseConfigured || !supabase) {
    return { ok: false, error: 'Cloud is not configured on this device.' };
  }

  const email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }

  const session = await ensureFreshSessionForEdge();
  if (!session?.user?.id) {
    return { ok: false, error: 'Could not start a session. Check your connection and try again.' };
  }

  const { error } = await supabase.from('coaching_waitlist').insert({
    email,
    user_id: session.user.id,
  });

  if (error) {
    if (error.code === '23505') {
      return { ok: true, alreadyListed: true };
    }
    if (__DEV__) {
      console.warn('[submitCoachingWaitlist]', error.message, error.code);
    }
    return { ok: false, error: error.message || 'Could not join waitlist.' };
  }

  return { ok: true };
}

/**
 * Joins the waitlist using the signed-in user's account email (no form).
 * Fails if the session has no email (e.g. phone-only); user should use email sign-in.
 */
/** True if the current session’s user_id already has a coaching waitlist row (for paywall / upgrade UI). */
export async function isCurrentUserOnCoachingWaitlist(): Promise<boolean> {
  if (!supabaseConfigured || !supabase) return false;
  const session = await ensureFreshSessionForEdge();
  const uid = session?.user?.id;
  if (!uid) return false;

  const { data, error } = await supabase
    .from('coaching_waitlist')
    .select('id')
    .eq('user_id', uid)
    .maybeSingle();

  if (error) {
    if (__DEV__) {
      console.warn('[isCurrentUserOnCoachingWaitlist]', error.message, error.code);
    }
    return false;
  }
  return Boolean(data);
}

export async function submitCoachingWaitlistFromSession(): Promise<SubmitWaitlistResult> {
  if (!supabaseConfigured || !supabase) {
    return { ok: false, error: 'Cloud is not configured on this device.' };
  }
  const session = await ensureFreshSessionForEdge();
  const raw = session?.user?.email;
  if (!raw?.trim()) {
    return {
      ok: false,
      error:
        'No email on this account. Use email sign-in from the welcome screen, then try again.',
    };
  }
  return submitCoachingWaitlist(raw);
}
