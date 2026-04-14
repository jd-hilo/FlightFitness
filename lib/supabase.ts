import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabaseConfigured = Boolean(url && anon);

export const supabase = supabaseConfigured
  ? createClient(url, anon, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

async function signInAnonymousWithRetry() {
  if (!supabase) return { session: null as null, error: null as Error | null };
  let lastErr: Error | null = null;
  for (let i = 0; i < 3; i++) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      lastErr = new Error(error.message);
      if (__DEV__) {
        console.warn(
          `[ensureSupabaseSession] signInAnonymously attempt ${i + 1}:`,
          error.message
        );
      }
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
      continue;
    }
    if (data.session) return { session: data.session, error: null };
    await new Promise((r) => setTimeout(r, 300));
  }
  return { session: null, error: lastErr };
}

async function validateSessionJwt(session: { access_token: string } | null) {
  if (!supabase || !session?.access_token) return false;
  const { data, error } = await supabase.auth.getUser(session.access_token);
  if (error || !data.user) {
    if (__DEV__) {
      console.warn(
        '[validateSessionJwt] invalid cached JWT:',
        error?.message ?? 'no user'
      );
    }
    return false;
  }
  return true;
}

/** Ensures a session so Edge Functions receive a JWT (anonymous if needed). */
export async function ensureSupabaseSession() {
  if (!supabase) return null;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) return session;

    const { session: anonSession, error } = await signInAnonymousWithRetry();
    if (!anonSession && __DEV__ && error) {
      console.warn(
        '[ensureSupabaseSession] No JWT after anonymous sign-in:',
        error.message,
        '— In Supabase Dashboard: Authentication → Providers → enable Anonymous.'
      );
    }
    return anonSession;
  } catch (e) {
    if (__DEV__) {
      console.warn('[ensureSupabaseSession] exception:', e);
    }
    return null;
  }
}

/**
 * Edge `verify_jwt` rejects expired access tokens ("Invalid JWT"). `getSession()`
 * can return a stale JWT before background refresh runs — refresh explicitly
 * before calling Functions.
 */
export async function ensureFreshSessionForEdge() {
  if (!supabase) return null;
  const session = await ensureSupabaseSession();
  if (!session) return null;

  const now = Math.floor(Date.now() / 1000);
  const exp = session.expires_at ?? 0;
  if (exp > now + 90 && (await validateSessionJwt(session))) return session;

  if (session.refresh_token) {
    const { data, error } = await supabase.auth.refreshSession();
    if (data.session && (await validateSessionJwt(data.session))) return data.session;
    if (__DEV__ && error) {
      console.warn('[ensureFreshSessionForEdge] refresh failed:', error.message);
    }
    if (exp > now && (await validateSessionJwt(session))) return session;
  }

  await supabase.auth.signOut({ scope: 'local' });
  const { session: anew } = await signInAnonymousWithRetry();
  if (await validateSessionJwt(anew)) return anew;
  return null;
}

/**
 * Call from welcome / cold entry: storage and anonymous sign-in can lag one tick.
 * Retries with backoff so we don’t navigate with a false “no JWT” while a later
 * `ensureSupabaseSession` would still succeed.
 */
export async function bootstrapAnonymousSession() {
  const waits = [0, 450, 900] as const;
  for (const ms of waits) {
    if (ms > 0) await new Promise((r) => setTimeout(r, ms));
    const session = await ensureSupabaseSession();
    if (session?.access_token) return session;
  }
  return null;
}
