"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import type { CoachRow } from "@/lib/coachTypes";

type Step = "profile" | "video";

export function CoachOnboardingWizard({ coach: initial }: { coach: CoachRow }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const hasProfile = Boolean(initial.display_name?.trim() && initial.bio?.trim());
  const hasVideo = Boolean(initial.intro_video_ready || initial.intro_video_url);

  const [step, setStep] = useState<Step>(hasProfile && !hasVideo ? "video" : "profile");
  const [displayName, setDisplayName] = useState(initial.display_name ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [coach, setCoach] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim() || !bio.trim()) {
      setError("Name and short bio are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/me/coach", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName.trim(),
          bio: bio.trim(),
        }),
      });
      const json = (await res.json()) as { error?: string; coach?: CoachRow };
      if (!res.ok) {
        setError(json.error ?? "Could not save profile");
        return;
      }
      if (json.coach) setCoach(json.coach);
      setStep("video");
    } finally {
      setSaving(false);
    }
  }

  async function uploadVideo(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/me/intro-video", { method: "POST", body: fd });
      const json = (await res.json()) as { error?: string; coach?: CoachRow };
      if (!res.ok) {
        setError(json.error ?? "Upload failed");
        return;
      }
      if (json.coach) setCoach(json.coach);
      router.replace("/dashboard");
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  const stepIndex = step === "profile" ? 1 : 2;

  return (
    <div className="min-h-screen bg-black text-on-background flex flex-col">
      <header className="px-6 py-5 flex items-center gap-3 border-b border-outline">
        <Image
          src="/header-logo.png"
          alt=""
          width={28}
          height={28}
          className="brightness-0 invert"
        />
        <span className="font-headline text-[11px] tracking-[0.28em] text-gold uppercase font-black">
          Flight Fitness
        </span>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <p className="label-caps mb-2">Coach setup · {stepIndex} of 2</p>
          <h1 className="font-headline text-3xl sm:text-4xl font-black uppercase tracking-tight leading-tight">
            {step === "profile" ? "Who are you?" : "Intro video"}
          </h1>
          <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
            {step === "profile"
              ? "Clients see your name and bio when they join. Keep it short and human."
              : "A short clip of you — why you coach. Optional; you can skip and add it later in Settings."}
          </p>

          <div className="mt-6 flex gap-2">
            <div
              className={`h-1 flex-1 ${stepIndex >= 1 ? "bg-gold" : "bg-outline"}`}
            />
            <div
              className={`h-1 flex-1 ${stepIndex >= 2 ? "bg-gold" : "bg-outline"}`}
            />
          </div>

          {error ? <p className="mt-4 text-sm text-error">{error}</p> : null}

          {step === "profile" ? (
            <form onSubmit={(e) => void saveProfile(e)} className="mt-8 space-y-5">
              <label className="block text-xs text-on-surface-variant">
                Display name
                <input
                  className="mt-1.5 block w-full bg-surface-low border border-outline px-3 py-3 text-sm text-on-background focus:border-gold outline-none"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Coach Jude"
                  autoFocus
                  required
                  maxLength={80}
                />
              </label>
              <label className="block text-xs text-on-surface-variant">
                Short bio
                <textarea
                  className="mt-1.5 block w-full bg-surface-low border border-outline px-3 py-3 text-sm text-on-background min-h-[120px] focus:border-gold outline-none resize-none"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Strength + faith coach. I help busy people train with purpose."
                  required
                  maxLength={400}
                />
                <span className="mt-1 block text-[10px] text-on-surface-variant/70">
                  {bio.trim().length}/400
                </span>
              </label>
              <button
                type="submit"
                disabled={saving}
                className="w-full px-6 py-3.5 bg-gold text-on-gold font-headline text-[11px] tracking-[0.18em] uppercase font-bold hover:bg-gold-dim disabled:opacity-50"
              >
                {saving ? "Saving…" : "Continue"}
              </button>
            </form>
          ) : (
            <div className="mt-8 space-y-5">
              {coach.intro_video_url ? (
                <video
                  key={coach.intro_video_url}
                  src={coach.intro_video_url}
                  controls
                  className="w-full max-h-64 bg-surface-low border border-outline"
                />
              ) : (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="w-full border border-dashed border-outline hover:border-gold px-6 py-16 text-center transition-colors"
                >
                  <p className="font-headline text-sm uppercase tracking-wide text-gold">
                    {uploading ? "Uploading…" : "Choose video"}
                  </p>
                  <p className="mt-2 text-xs text-on-surface-variant">
                    MP4, MOV, or WebM · under 100MB
                  </p>
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadVideo(f);
                }}
              />
              <div className="flex flex-col gap-3">
                {!coach.intro_video_url ? (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="w-full px-6 py-3.5 bg-gold text-on-gold font-headline text-[11px] tracking-[0.18em] uppercase font-bold hover:bg-gold-dim disabled:opacity-50"
                  >
                    {uploading ? "Uploading…" : "Upload intro video"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      router.replace("/dashboard");
                      router.refresh();
                    }}
                    className="w-full px-6 py-3.5 bg-gold text-on-gold font-headline text-[11px] tracking-[0.18em] uppercase font-bold hover:bg-gold-dim"
                  >
                    Enter dashboard
                  </button>
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                  {!coach.intro_video_url ? (
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => {
                        router.replace("/dashboard");
                        router.refresh();
                      }}
                      className="flex-1 px-6 py-3.5 border border-outline text-on-surface-variant font-headline text-[11px] tracking-[0.18em] uppercase font-bold hover:border-gold hover:text-gold"
                    >
                      Skip for now
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setStep("profile")}
                    className="flex-1 px-6 py-3.5 border border-outline text-on-surface-variant font-headline text-[11px] tracking-[0.18em] uppercase font-bold hover:border-gold hover:text-gold"
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
