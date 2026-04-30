import { supabase, supabaseConfigured } from '@/lib/supabase';

const APPLE_REVIEW_EMAIL = 'apple@test.com';
const APPLE_REVIEW_CODE = '111111';

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isAppleReviewEmail(email: string): boolean {
  return email === APPLE_REVIEW_EMAIL;
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
  if (isAppleReviewEmail(email)) {
    return { ok: true };
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
  if (isAppleReviewEmail(email)) {
    if (token !== APPLE_REVIEW_CODE) {
      return { ok: false, error: 'Use 111111 for the Apple review account.' };
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: APPLE_REVIEW_CODE,
    });
    if (!signInError) return { ok: true };

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password: APPLE_REVIEW_CODE,
    });
    if (signUpError) {
      if (__DEV__) console.warn('[verifyEmailOtp:appleReview]', signUpError.message);
      return { ok: false, error: signUpError.message };
    }
    if (data.session) return { ok: true };

    const { error: retryError } = await supabase.auth.signInWithPassword({
      email,
      password: APPLE_REVIEW_CODE,
    });
    if (retryError) {
      if (__DEV__) console.warn('[verifyEmailOtp:appleReview]', retryError.message);
      return { ok: false, error: retryError.message };
    }
    return { ok: true };
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
