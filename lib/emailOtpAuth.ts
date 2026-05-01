import { supabase, supabaseConfigured } from '@/lib/supabase';

const APPLE_REVIEW_EMAIL = 'apple@test.com';
const APPLE_REVIEW_CODE = '111111';
/** Shown when the user exists but password is not the review password (backend misconfiguration). */
const APPLE_REVIEW_ACCOUNT_TITLE = "We couldn't finish sign-in for this demo account.";
const APPLE_REVIEW_ACCOUNT_CAPTION =
  "You used the correct review code. The developer needs to reset this email’s password in their auth settings so it matches App Review credentials (111111), or remove and recreate the user.";

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
  | {
      ok: false;
      error: string;
      /** Extra line(s) for multi-part messages (e.g. App Review demo account setup). */
      caption?: string;
      /** `notice` = informational card; default = inline error styling. */
      variant?: 'default' | 'notice';
    };

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
      return {
        ok: false,
        error: 'Wrong code',
        caption: 'For App Store review testing, enter 111111.',
        variant: 'notice',
      };
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
      if (signUpError.message.toLowerCase().includes('already')) {
        return {
          ok: false,
          error: APPLE_REVIEW_ACCOUNT_TITLE,
          caption: APPLE_REVIEW_ACCOUNT_CAPTION,
          variant: 'notice',
        };
      }
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
