import { NextRequest, NextResponse } from "next/server";

import { requireCoach } from "@/lib/requireCoach";
import { adminServiceUnavailable, createAdminClient } from "@/lib/supabase/admin";

/** Marks user → coach messages as read for this client (updates `coach_last_read_at` only). */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireCoach();
  if (!auth.ok) return auth.response;

  const { id: userId } = await context.params;
  const admin = createAdminClient();
  if (!admin) return adminServiceUnavailable();

  const now = new Date().toISOString();

  const { data: existing } = await admin
    .from("coach_threads")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("coach_threads")
      .update({ coach_last_read_at: now, updated_at: now })
      .eq("user_id", userId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await admin.from("coach_threads").insert({
      user_id: userId,
      coach_last_read_at: now,
      updated_at: now,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
