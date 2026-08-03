import { NextRequest, NextResponse } from "next/server";

import { assertCoachOwnsClient } from "@/lib/assertCoachClient";
import { patchCoachOnboarding } from "@/lib/coachProvision";
import { weekPlanSchema } from "@/lib/flight/plan";
import { requireCoach } from "@/lib/requireCoach";
import { adminServiceUnavailable, createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
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

  const rawPlan =
    body && typeof body === "object" && "plan" in body
      ? (body as { plan: unknown }).plan
      : body;

  const parsed = weekPlanSchema.safeParse(rawPlan);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid plan", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const plan = parsed.data;
  if (!plan.weekStart) {
    return NextResponse.json({ error: "Plan weekStart required" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return adminServiceUnavailable();

  const owned = await assertCoachOwnsClient(admin, auth.userId, userId);
  if (!owned.ok) return owned.response;

  const payload = plan as unknown as Record<string, unknown>;

  const { data: existing, error: findError } = await admin
    .from("plans")
    .select("id")
    .eq("user_id", userId)
    .eq("week_start", plan.weekStart)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 });
  }

  if (existing?.id) {
    const { error } = await admin.from("plans").update({ payload }).eq("id", existing.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await admin.from("plans").insert({
      user_id: userId,
      week_start: plan.weekStart,
      payload,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  await patchCoachOnboarding(auth.userId, { firstPlan: true });

  return NextResponse.json({ ok: true, plan });
}
