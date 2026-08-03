"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { CoachRow } from "@/lib/coachTypes";

export function CoachSettingsForm({ coach: initial }: { coach: CoachRow }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [coach, setCoach] = useState(initial);
  const [displayName, setDisplayName] = useState(initial.display_name ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function saveProfile() {
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch("/api/me/coach", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName, bio }),
      });
      const json = (await res.json()) as { error?: string; coach?: CoachRow };
      if (!res.ok) {
        setError(json.error ?? "Save failed");
        return;
      }
      if (json.coach) setCoach(json.coach);
      setOk(true);
      router.refresh();
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
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-xl space-y-8">
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {ok ? <p className="text-sm text-gold">Profile saved.</p> : null}

      <section className="space-y-3 border border-outline bg-surface-low p-5">
        <p className="label-caps">Profile</p>
        <label className="block text-xs text-on-surface-variant">
          Display name
          <input
            className="mt-1 block w-full bg-black border border-outline px-3 py-2 text-sm text-on-background"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Coach name"
          />
        </label>
        <label className="block text-xs text-on-surface-variant">
          Short bio
          <textarea
            className="mt-1 block w-full bg-black border border-outline px-3 py-2 text-sm text-on-background min-h-[96px]"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Who you coach and how you help"
          />
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveProfile()}
          className="px-4 py-2 bg-gold text-on-gold font-headline text-[10px] tracking-[0.15em] uppercase font-bold hover:bg-gold-dim disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </section>

      <section className="space-y-3 border border-outline bg-surface-low p-5">
        <p className="label-caps">Intro video</p>
        <p className="text-sm text-on-surface-variant">
          Clients see this when they join. Re-upload anytime.
        </p>
        {coach.intro_video_url ? (
          <video
            key={coach.intro_video_url}
            src={coach.intro_video_url}
            controls
            className="w-full max-h-64 bg-black border border-outline"
          />
        ) : (
          <p className="text-sm text-on-surface-variant">No video uploaded yet.</p>
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
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="px-4 py-2 border border-gold text-gold font-headline text-[10px] tracking-[0.15em] uppercase font-bold hover:bg-gold/10 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : coach.intro_video_ready ? "Replace video" : "Upload video"}
        </button>
      </section>

      {coach.invite_code ? (
        <section className="border border-outline bg-surface-low p-5">
          <p className="label-caps mb-1">Invite code</p>
          <p className="font-headline text-2xl font-black tracking-[0.2em] text-gold">
            {coach.invite_code}
          </p>
        </section>
      ) : null}
    </div>
  );
}
