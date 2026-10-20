import { Platform } from 'react-native';

import { isScreenshotMode } from '@/lib/screenshotMode';
import { supabase, supabaseConfigured } from '@/lib/supabase';

export type AppleAuthenticationModule = typeof import('expo-apple-authentication');

let cachedModule: AppleAuthenticationModule | null | undefined;

/**
 * Load Sign in with Apple only on iOS. Web and Android never require the native module,
 * and a dev client built before the module was added fails the require instead of crashing the app.
 */
export function getAppleAuthenticationModule(): AppleAuthenticationModule | null {
  if (isScreenshotMode) {
    return {
      isAvailableAsync: async () => true,
    } as AppleAuthenticationModule;
  }
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
  if (isScreenshotMode) return true;
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

function isCancelError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) return false;
  return String((error as { code?: unknown }).code) === 'ERR_REQUEST_CANCELED';
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
      return { ok: false, cancelled: false, error: error.message };
    }

    const givenName = credential.fullName?.givenName?.trim();
    return { ok: true, givenName: givenName || undefined };
  } catch (error) {
    if (isCancelError(error)) return { ok: false, cancelled: true };
    const message = error instanceof Error ? error.message : 'Apple sign-in failed.';
    return { ok: false, cancelled: false, error: message };
  }
}
