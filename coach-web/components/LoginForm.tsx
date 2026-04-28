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
    forbidden ? "This account is not allowed to use the coach dashboard." : null
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
      router.replace("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 px-4">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">Flight Coach</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {step === "email"
              ? "We will email you a 6-digit code. No password."
              : `Enter the code sent to ${email}`}
          </p>
        </div>
        {step === "email" ? (
          <form onSubmit={(e) => void onSendCode(e)} className="space-y-4 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Email</label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-md bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={(e) => void onVerify(e)} className="space-y-4 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">6-digit code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                className="w-full rounded-md bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm tracking-widest font-mono"
                placeholder="000000"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-md bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 disabled:opacity-50"
            >
              {loading ? "Verifying…" : "Verify & sign in"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
              className="w-full text-sm text-zinc-400 hover:text-zinc-200"
            >
              Use a different email
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void sendCode()}
              className="w-full text-xs text-amber-500/90 hover:text-amber-400"
            >
              Resend code
            </button>
          </form>
        )}
        <p className="text-xs text-zinc-500 text-center leading-relaxed">
          Supabase → Authentication → Email: enable provider. Magic Link template must include{" "}
          <code className="text-zinc-400">{"{{ .Token }}"}</code> for a numeric code. Coach access still requires{" "}
          <code className="text-zinc-400">COACH_ALLOWED_USER_IDS</code>.{" "}
          <Link href="/" className="text-amber-500 underline">
            Home
          </Link>
        </p>
      </div>
    </div>
  );
}
