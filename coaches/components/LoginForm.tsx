"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { requestEmailOtp, verifyEmailOtp } from "@/lib/emailOtpClient";

type Step = "email" | "code";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const forbidden = params.get("error") === "forbidden";

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(
    forbidden ? "This account cannot access the coach portal." : null
  );
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    setLoading(true);
    setError(null);
    try {
      const res = await requestEmailOtp(email);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setStep("code");
    } finally {
      setLoading(false);
    }
  }

  async function onSendCode(e: React.FormEvent) {
    e.preventDefault();
    await sendCode();
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await verifyEmailOtp(email, code);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await fetch("/api/me/coach", { method: "POST" });
      router.replace("/onboarding");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-on-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link
            href="/"
            className="font-headline text-2xl font-black italic text-gold uppercase tracking-tight"
          >
            Flight
          </Link>
          <p className="text-sm text-on-surface-variant mt-3">
            {step === "email"
              ? "We email you a 6-digit code. No password."
              : `Enter the code sent to ${email}`}
          </p>
        </div>
        {step === "email" ? (
          <form
            onSubmit={(e) => void onSendCode(e)}
            className="space-y-4 border border-outline bg-surface-low p-6"
          >
            {error ? <p className="text-sm text-error">{error}</p> : null}
            <div>
              <label className="label-caps mb-2 block">Email</label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black border border-outline px-3 py-2.5 text-sm text-on-background focus:outline-none focus:border-gold"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gold text-on-gold font-headline text-xs tracking-[0.15em] uppercase font-bold hover:bg-gold-dim disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={(e) => void onVerify(e)}
            className="space-y-4 border border-outline bg-surface-low p-6"
          >
            {error ? <p className="text-sm text-error">{error}</p> : null}
            <div>
              <label className="label-caps mb-2 block">6-digit code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full bg-black border border-outline px-3 py-2.5 text-sm tracking-[0.3em] text-center text-on-background focus:outline-none focus:border-gold"
              />
            </div>
            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full py-3 bg-gold text-on-gold font-headline text-xs tracking-[0.15em] uppercase font-bold hover:bg-gold-dim disabled:opacity-50"
            >
              {loading ? "Verifying…" : "Continue"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
              className="w-full text-xs text-on-surface-variant hover:text-gold"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
