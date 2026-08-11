import { NextResponse } from "next/server";

import { ensureCoachRecord, getCoachRecord } from "@/lib/coachProvision";
import { isSupabasePublicConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  if (!isSupabasePublicConfigured()) {
    return NextResponse.json({ error: "Misconfigured" }, { status: 503 });
  }
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const coach = await getCoachRecord(user.id);
  if (!coach) return NextResponse.json({ coach: null });
  return NextResponse.json({ coach });
}

export async function POST() {
  if (!isSupabasePublicConfigured()) {
    return NextResponse.json({ error: "Misconfigured" }, { status: 503 });
  }
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const coach = await ensureCoachRecord(user.id, user.email);
  if (!coach) {
    return NextResponse.json({ error: "Could not create coach profile" }, { status: 500 });
  }
  return NextResponse.json({ coach });
}

export async function PATCH(request: Request) {
  const { createAdminClient, adminServiceUnavailable } = await import(
    "@/lib/supabase/admin"
  );
  const { patchCoachOnboarding } = await import("@/lib/coachProvision");

  if (!isSupabasePublicConfigured()) {
    return NextResponse.json({ error: "Misconfigured" }, { status: 503 });
  }
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return adminServiceUnavailable();

  const body = (await request.json()) as {
    display_name?: string;
    bio?: string;
    intro_video_url?: string;
    intro_video_ready?: boolean;
    onboarding?: Record<string, boolean>;
  };

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof body.display_name === "string") updates.display_name = body.display_name.trim();
  if (typeof body.bio === "string") updates.bio = body.bio.trim();
  if (typeof body.intro_video_url === "string") {
    updates.intro_video_url = body.intro_video_url;
    updates.intro_video_ready = true;
  }
  if (typeof body.intro_video_ready === "boolean") {
    updates.intro_video_ready = body.intro_video_ready;
  }

  const { data, error } = await admin
    .from("coaches")
    .update(updates)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.onboarding) {
    await patchCoachOnboarding(user.id, body.onboarding);
  } else if (body.display_name || body.bio) {
    await patchCoachOnboarding(user.id, { profileComplete: true });
  }
  if (body.intro_video_url || body.intro_video_ready) {
    await patchCoachOnboarding(user.id, { introVideo: true });
  }

  const coach = await getCoachRecord(user.id);
  return NextResponse.json({ coach: coach ?? data });
}
