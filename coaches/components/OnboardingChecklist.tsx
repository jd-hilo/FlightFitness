"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import type { CoachOnboarding, CoachRow } from "@/lib/coachTypes";

type Item = {
  key: keyof CoachOnboarding;
  label: string;
  hint: string;
  href?: string;
};

const ITEMS: Item[] = [
  {
    key: "profileComplete",
    label: "Complete profile",
    hint: "Add your name and a short bio",
    href: "/settings",
  },
  {
    key: "introVideo",
    label: "Upload intro video",
    hint: "Share who you are with clients",
  },
  {
    key: "firstClient",
    label: "Invite or claim first client",
    hint: "Share your invite code",
    href: "/clients",
  },
  {
    key: "firstPlan",
    label: "Push first week plan",
    hint: "Meals + workouts into their app",
    href: "/clients",
  },
  {
    key: "firstReflection",
    label: "Assign first reflection prompt",
    hint: "Shows on their Faith tab",
    href: "/clients",
  },
  {
    key: "firstMessage",
    label: "Send first message",
    hint: "Open the inbox and say hello",
    href: "/messages",
  },
];

export function OnboardingChecklist({
  coach: initial,
  compact,
}: {
  coach: CoachRow;
  compact?: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [coach, setCoach] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doneCount = useMemo(
    () => ITEMS.filter((i) => Boolean(coach.onboarding[i.key])).length,
    [coach.onboarding]
  );

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
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={compact ? "" : "border border-outline bg-surface-low p-5"}>
      <div className="mb-4">
        <p className="label-caps mb-1">Setup checklist</p>
        <h2 className="font-headline text-xl font-black uppercase tracking-tight">
          {doneCount}/{ITEMS.length} complete
        </h2>
        <p className="mt-2 text-xs text-on-surface-variant leading-relaxed max-w-md">
          Optional guide — Clients and Messages are open whenever you&apos;re ready.
        </p>
      </div>

      {error ? <p className="text-sm text-error mb-3">{error}</p> : null}

      <ul className="space-y-0 divide-y divide-outline">
        {ITEMS.map((item) => {
          const checked = Boolean(coach.onboarding[item.key]);
          const isVideo = item.key === "introVideo";
          return (
            <li key={item.key} className="flex items-start gap-3 py-3">
              <input
                type="checkbox"
                checked={checked}
                readOnly
                className="mt-1 h-4 w-4 accent-[var(--gold)]"
                aria-label={item.label}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`font-headline text-sm uppercase tracking-wide ${
                    checked ? "text-on-surface-variant line-through" : "text-on-background"
                  }`}
                >
                  {item.label}
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">{item.hint}</p>
                {isVideo && !checked ? (
                  <div className="mt-2">
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
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileRef.current?.click()}
                      className="px-4 py-2 bg-gold text-on-gold font-headline text-[10px] tracking-[0.15em] uppercase font-bold hover:bg-gold-dim disabled:opacity-50"
                    >
                      {uploading ? "Uploading…" : "Upload intro video"}
                    </button>
                  </div>
                ) : null}
                {!isVideo && !checked && item.href ? (
                  <Link
                    href={item.href}
                    className="inline-block mt-2 text-[10px] font-headline tracking-[0.15em] uppercase text-gold hover:text-gold-dim"
                  >
                    Go →
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {coach.invite_code ? (
        <div className="mt-5 pt-4 border-t border-outline">
          <p className="label-caps mb-1">Your invite code</p>
          <p className="font-headline text-2xl font-black tracking-[0.2em] text-gold">
            {coach.invite_code}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">
            Clients enter this in Flight to join your roster.
          </p>
        </div>
      ) : null}
    </div>
  );
}
