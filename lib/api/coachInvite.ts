import { ensureFreshSessionForEdge, supabase, supabaseConfigured } from '@/lib/supabase';

export type AcceptCoachInviteResult =
  | {
      ok: true;
      coachId: string;
      coachDisplayName: string | null;
      subscriptionTier: string | null;
    }
  | { ok: false; error: string };

/** Join a coach roster via invite code (RPC). May set subscription_tier to coaching. */
export async function acceptCoachInvite(
  code: string
): Promise<AcceptCoachInviteResult> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { ok: false, error: 'Enter an invite code.' };
  if (!supabaseConfigured || !supabase) {
    return { ok: false, error: 'Not connected.' };
  }
  await ensureFreshSessionForEdge();
  const { data, error } = await supabase.rpc('accept_coach_invite', {
    p_code: trimmed,
  });
  if (error) {
    if (__DEV__) console.warn('[acceptCoachInvite]', error.message);
    return { ok: false, error: error.message };
  }
  const row = data as {
    ok?: boolean;
    error?: string;
    coach_id?: string;
    coach_display_name?: string | null;
    subscription_tier?: string | null;
  } | null;
  if (!row?.ok) {
    return { ok: false, error: row?.error ?? 'Could not join coach.' };
  }
  return {
    ok: true,
    coachId: String(row.coach_id),
    coachDisplayName: row.coach_display_name ?? null,
    subscriptionTier: row.subscription_tier ?? null,
  };
}
