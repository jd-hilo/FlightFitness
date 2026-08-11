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
    .from("coach_messages")
    .select("id, user_id, sender, body, created_at, coach_id")
    .eq("user_id", userId)
    .or(`coach_id.eq.${auth.userId},coach_id.is.null`)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireCoach({ requireIntroVideo: true });
  if (!auth.ok) return auth.response;

  const { id: userId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text =
    body &&
    typeof body === "object" &&
    "body" in body &&
    typeof (body as { body: unknown }).body === "string"
      ? (body as { body: string }).body.trim()
      : "";

  if (!text) {
    return NextResponse.json({ error: "Message body is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return adminServiceUnavailable();

  const owned = await assertCoachOwnsClient(admin, auth.userId, userId);
  if (!owned.ok) return owned.response;

  const now = new Date().toISOString();

  const { error: insertError } = await admin.from("coach_messages").insert({
    user_id: userId,
    sender: "coach",
    body: text,
    coach_id: auth.userId,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { data: threadRow } = await admin
    .from("coach_threads")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (threadRow) {
    await admin
      .from("coach_threads")
      .update({
        updated_at: now,
        coach_id: auth.userId,
        coach_last_read_at: now,
      })
      .eq("user_id", userId);
  } else {
    await admin.from("coach_threads").insert({
      user_id: userId,
      updated_at: now,
      coach_id: auth.userId,
      coach_last_read_at: now,
    });
  }

  await patchCoachOnboarding(auth.userId, { firstMessage: true });

  return NextResponse.json({ ok: true });
}
