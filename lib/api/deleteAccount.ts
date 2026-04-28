import { ensureFreshSessionForEdge, supabase, supabaseConfigured } from '@/lib/supabase';

export type DeleteAccountResult = { ok: true } | { ok: false; error: string };

/**
 * Permanently deletes the signed-in auth user (server-side). Requires deployed
 * `delete-account` Edge Function and `SUPABASE_SERVICE_ROLE_KEY` in function secrets.
 */
export async function deleteAccount(): Promise<DeleteAccountResult> {
  if (!supabaseConfigured || !supabase) {
    return { ok: false, error: 'Cloud is not configured on this device.' };
  }

  const session = await ensureFreshSessionForEdge();
  const token = session?.access_token;
  if (!token) {
    return { ok: false, error: 'You are not signed in.' };
  }

  const base = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const url = `${base.replace(/\/$/, '')}/functions/v1/delete-account`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(anon ? { apikey: anon } : {}),
      },
    });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const msg =
        json &&
        typeof json === 'object' &&
        'error' in json &&
        typeof (json as { error: unknown }).error === 'string'
          ? (json as { error: string }).error
          : `Request failed (${res.status})`;
      return { ok: false, error: msg };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || 'Network error.' };
  }
}
