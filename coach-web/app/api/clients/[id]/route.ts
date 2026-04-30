import { NextRequest, NextResponse } from "next/server";

import { requireCoach } from "@/lib/requireCoach";
import { adminServiceUnavailable, createAdminClient } from "@/lib/supabase/admin";
import { normalizeWeekPlanFromAI } from "@/lib/flight/weekPlanAINormalize";
import { weekPlanSchema, type WeekPlan } from "@/lib/flight/plan";
import { viewWeekStartYmdLocal } from "@/lib/flight/weekUtils";

function parseRemotePayload(raw: unknown): WeekPlan | null {
  const normalized = normalizeWeekPlanFromAI(raw);
  const parsed = weekPlanSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireCoach();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const weekStart =
    request.nextUrl.searchParams.get("weekStart") ?? viewWeekStartYmdLocal();

  const admin = createAdminClient();
  if (!admin) return adminServiceUnavailable();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select(
      "id, onboarding_json, subscription_tier, display_name, email, first_name, updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const { data: planRows, error: planError } = await admin
    .from("plans")
    .select("payload, week_start, created_at")
    .eq("user_id", id)
    .eq("week_start", weekStart)
    .order("created_at", { ascending: false })
    .limit(1);

  if (planError) {
    return NextResponse.json({ error: planError.message }, { status: 500 });
  }

  const rawPayload = planRows?.[0]?.payload;
  const plan = rawPayload ? parseRemotePayload(rawPayload) : null;

  const { data: thread } = await admin
    .from("coach_threads")
    .select("coach_last_read_at, last_read_at")
    .eq("user_id", id)
    .maybeSingle();

  return NextResponse.json({
    profile,
    weekStart,
    plan,
    coachThread: thread ?? null,
  });
}
