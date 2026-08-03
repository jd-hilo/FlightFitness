import { NextRequest, NextResponse } from "next/server";

import { assertCoachOwnsClient } from "@/lib/assertCoachClient";
import { requireCoach } from "@/lib/requireCoach";
import { adminServiceUnavailable, createAdminClient } from "@/lib/supabase/admin";

export async function POST(
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

  const now = new Date().toISOString();

  const { data: existing } = await admin
    .from("coach_threads")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("coach_threads")
      .update({
        coach_last_read_at: now,
        updated_at: now,
        coach_id: auth.userId,
      })
      .eq("user_id", userId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await admin.from("coach_threads").insert({
      user_id: userId,
      coach_last_read_at: now,
      updated_at: now,
      coach_id: auth.userId,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
