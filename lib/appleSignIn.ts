import { Platform } from 'react-native';
import type { User } from '@supabase/supabase-js';

import { persistProfileFirstName } from '@/lib/api/profileFirstName';
import { supabase, supabaseConfigured } from '@/lib/supabase';

export type AppleAuthenticationModule = typeof import('expo-apple-authentication');

let cachedModule: AppleAuthenticationModule | null | undefined;

/**
 * Load Sign in with Apple only on iOS. Web and Android never require the native module,
 * and a dev client built before the module was added fails the require instead of crashing the app.
 */
export function getAppleAuthenticationModule(): AppleAuthenticationModule | null {
  if (Platform.OS !== 'ios') return null;
  if (cachedModule !== undefined) return cachedModule;
  try {
    cachedModule = require('expo-apple-authentication') as AppleAuthenticationModule;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  const apple = getAppleAuthenticationModule();
  if (!apple) return false;
  try {
    return await apple.isAvailableAsync();
  } catch {
    return false;
  }
}

export type AppleSignInResult =
  | { ok: true; givenName?: string }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled: false; error: string };

function errorCode(error: unknown): string {
  if (!error || typeof error !== 'object' || !('code' in error)) return '';
  return String((error as { code?: unknown }).code ?? '');
}

function isCancelError(error: unknown): boolean {
  const code = errorCode(error);
  return code === 'ERR_REQUEST_CANCELED' || code === '1001';
}

function describeAppleError(error: unknown): string {
  const code = errorCode(error);
  const message = error instanceof Error ? error.message : '';
  if (code === 'ERR_REQUEST_UNKNOWN' || code === '1000') {
    return 'Apple could not complete sign-in. Try again, or use email.';
  }
  if (message.toLowerCase().includes('audience')) {
    return 'Apple sign-in is not fully configured for this app yet.';
  }
  if (message) return message;
  return 'Apple sign-in failed.';
}

function describeSupabaseError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('audience') || lower.includes('unacceptable')) {
    return 'Apple sign-in is not fully configured for this app yet.';
  }
  if (lower.includes('provider is not enabled') || lower.includes('unsupported provider')) {
    return 'Apple sign-in is turned off in the project. Use email for now.';
  }
  return message;
}

function firstNonEmpty(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

function firstNameFromPersonName(name: {
  givenName?: string | null;
  middleName?: string | null;
  familyName?: string | null;
  nickname?: string | null;
} | null | undefined): string | undefined {
  if (!name) return undefined;
  const given = firstNonEmpty(name.givenName, name.nickname);
  if (given) return given;
  const assembled = [name.givenName, name.middleName, name.familyName]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(' ')
    .trim();
  return assembled ? assembled.split(/\s+/)[0] : undefined;
}

function firstNameFromUser(user: User | null): string | undefined {
  if (!user) return undefined;
  const meta = user.user_metadata ?? {};
  const fromMeta = firstNonEmpty(
    meta.given_name,
    meta.givenName,
    typeof meta.full_name === 'string' ? meta.full_name.split(/\s+/)[0] : undefined,
    typeof meta.name === 'string' ? meta.name.split(/\s+/)[0] : undefined
  );
  if (fromMeta) return fromMeta;

  const appleIdentity = user.identities?.find((identity) => identity.provider === 'apple');
  const data = appleIdentity?.identity_data ?? {};
  return firstNonEmpty(
    data.given_name,
    data.givenName,
    typeof data.full_name === 'string' ? data.full_name.split(/\s+/)[0] : undefined,
    typeof data.name === 'string' ? data.name.split(/\s+/)[0] : undefined
  );
}

async function rememberAppleFirstName(givenName: string, fullName?: string) {
  if (!supabase) return;
  try {
    await supabase.auth.updateUser({
      data: {
        given_name: givenName,
        ...(fullName ? { full_name: fullName } : {}),
      },
    });
  } catch (error) {
    if (__DEV__) console.warn('[signInWithApple] updateUser name', error);
  }
  const saved = await persistProfileFirstName(givenName);
  if (!saved.ok && __DEV__) {
    console.warn('[signInWithApple] persist first name', saved.error);
  }
}

/** Native Apple sheet, then Supabase `signInWithIdToken`. */
export async function signInWithApple(): Promise<AppleSignInResult> {
  if (!supabaseConfigured || !supabase) {
    return { ok: false, cancelled: false, error: 'Supabase is not configured on this device.' };
  }

  const apple = getAppleAuthenticationModule();
  if (!apple) {
    return { ok: false, cancelled: false, error: 'Apple sign-in is not available on this device.' };
  }

  try {
    const credential = await apple.signInAsync({
      requestedScopes: [
        apple.AppleAuthenticationScope.FULL_NAME,
        apple.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return { ok: false, cancelled: false, error: 'Apple did not return a sign-in token.' };
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user?.is_anonymous) {
      await supabase.auth.signOut({ scope: 'local' });
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error) {
      if (__DEV__) console.warn('[signInWithApple] supabase', error.message);
      return { ok: false, cancelled: false, error: describeSupabaseError(error.message) };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        ok: false,
        cancelled: false,
        error: 'Apple signed in, but the session did not start. Try again.',
      };
    }

    const fromCredential = firstNameFromPersonName(credential.fullName);
    const givenName = fromCredential ?? firstNameFromUser(user);
    if (givenName) {
      const assembled = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.middleName, credential.fullName.familyName]
            .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
            .join(' ')
            .trim()
        : '';
      await rememberAppleFirstName(givenName, assembled || givenName);
    }
    return { ok: true, givenName };
  } catch (error) {
    if (isCancelError(error)) return { ok: false, cancelled: true };
    if (__DEV__) console.warn('[signInWithApple]', error);
    return { ok: false, cancelled: false, error: describeAppleError(error) };
  }
}
