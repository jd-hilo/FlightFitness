import { supabase, supabaseConfigured } from '@/lib/supabase';

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export type OtpRequestResult =
  | { ok: true }
  | { ok: false; error: string };

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Sends a one-time code to the email (Supabase "Magic Link" template must include `{{ .Token }}` for OTP).
 * @see https://supabase.com/docs/guides/auth/auth-email-passwordless#with-otp
 */
export async function requestEmailOtp(emailRaw: string): Promise<OtpRequestResult> {
  if (!supabaseConfigured || !supabase) {
    return { ok: false, error: 'Supabase is not configured on this device.' };
  }
  const email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    if (__DEV__) console.warn('[requestEmailOtp]', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Verifies the 6-digit code from the email. */
export async function verifyEmailOtp(
  emailRaw: string,
  tokenRaw: string
): Promise<OtpVerifyResult> {
  if (!supabaseConfigured || !supabase) {
    return { ok: false, error: 'Supabase is not configured on this device.' };
  }
  const email = normalizeEmail(emailRaw);
  const token = tokenRaw.replace(/\D/g, '').trim();
  if (token.length < 6) {
    return { ok: false, error: 'Enter the 6-digit code from your email.' };
  }

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) {
    if (__DEV__) console.warn('[verifyEmailOtp]', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
