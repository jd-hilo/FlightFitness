"use client";

import { createClient } from "@/lib/supabase/client";

function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

export async function requestEmailOtp(emailRaw: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }
  const email = normalizeEmail(emailRaw);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function verifyEmailOtp(
  emailRaw: string,
  tokenRaw: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }
  const email = normalizeEmail(emailRaw);
  const token = tokenRaw.replace(/\D/g, "");
  if (token.length < 6) {
    return { ok: false, error: "Enter the 6-digit code from your email." };
  }
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
