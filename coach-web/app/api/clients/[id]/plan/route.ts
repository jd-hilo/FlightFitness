import { NextRequest, NextResponse } from "next/server";

import { requireCoach } from "@/lib/requireCoach";
import { adminServiceUnavailable, createAdminClient } from "@/lib/supabase/admin";
import { weekPlanSchema } from "@/lib/flight/plan";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireCoach();
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

  return NextResponse.json({ ok: true, plan });
}
