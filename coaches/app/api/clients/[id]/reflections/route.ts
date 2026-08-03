import { NextRequest, NextResponse } from "next/server";

import { assertCoachOwnsClient } from "@/lib/assertCoachClient";
import { patchCoachOnboarding } from "@/lib/coachProvision";
import { requireCoach } from "@/lib/requireCoach";
import { adminServiceUnavailable, createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireCoach({ requireIntroVideo: true });
  if (!auth.ok) return auth.response;

  const { id: userId } = await context.params;
  const admin = createAdminClient();
  if (!admin) return adminServiceUnavailable();

  const owned = await assertCoachOwnsClient(admin, auth.userId, userId);
  if (!owned.ok) return owned.response;

  const { data, error } = await admin
    .from("coach_reflection_prompts")
    .select("id, prompt_date, title, body, created_at")
    .eq("coach_id", auth.userId)
    .eq("client_user_id", userId)
    .order("prompt_date", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ prompts: data ?? [] });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireCoach({ requireIntroVideo: true });
  if (!auth.ok) return auth.response;

  const { id: userId } = await context.params;
  const admin = createAdminClient();
  if (!admin) return adminServiceUnavailable();

  const owned = await assertCoachOwnsClient(admin, auth.userId, userId);
  if (!owned.ok) return owned.response;

  const body = (await request.json()) as {
    prompt_date?: string;
    title?: string;
    body?: string;
  };

  const promptDate = body.prompt_date?.trim();
  const text = body.body?.trim();
  if (!promptDate || !text) {
    return NextResponse.json(
      { error: "prompt_date and body are required" },
      { status: 400 }
    );
  }

  const { data, error } = await admin
    .from("coach_reflection_prompts")
    .upsert(
      {
        coach_id: auth.userId,
        client_user_id: userId,
        prompt_date: promptDate,
        title: body.title?.trim() || "Reflection",
        body: text,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_user_id,prompt_date" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await patchCoachOnboarding(auth.userId, { firstReflection: true });

  return NextResponse.json({ prompt: data });
}
