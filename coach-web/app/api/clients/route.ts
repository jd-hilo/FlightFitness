import { NextRequest, NextResponse } from "next/server";

import { requireCoach } from "@/lib/requireCoach";
import { adminServiceUnavailable, createAdminClient } from "@/lib/supabase/admin";

type ProfileRow = {
  id: string;
  onboarding_json: unknown;
  subscription_tier: string;
  display_name: string | null;
  email: string | null;
  first_name: string | null;
  updated_at: string;
};

export async function GET(request: NextRequest) {
  const auth = await requireCoach();
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  if (!admin) return adminServiceUnavailable();

  const tier = request.nextUrl.searchParams.get("tier");
  const search = request.nextUrl.searchParams.get("search")?.trim().toLowerCase();

  let q = admin
    .from("profiles")
    .select(
      "id, onboarding_json, subscription_tier, display_name, email, first_name, updated_at"
    )
    .order("updated_at", { ascending: false });

  if (tier === "coaching") {
    q = q.eq("subscription_tier", "coaching");
  }

  const { data: profiles, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let list = (profiles ?? []) as ProfileRow[];
  if (search) {
    list = list.filter((p) => {
      const name = (p.display_name ?? "").toLowerCase();
      const email = (p.email ?? "").toLowerCase();
      const first = (p.first_name ?? "").toLowerCase();
      return (
        name.includes(search) ||
        email.includes(search) ||
        first.includes(search) ||
        p.id.toLowerCase().includes(search)
      );
    });
  }

  const ids = list.map((p) => p.id);
  if (ids.length === 0) {
    return NextResponse.json({ clients: [] });
  }

  const [{ data: planRows, error: planErr }, { data: threads, error: threadErr }, { data: msgs, error: msgErr }] =
    await Promise.all([
      admin
        .from("plans")
        .select("user_id, week_start, created_at")
        .in("user_id", ids)
        .order("created_at", { ascending: false }),
      admin.from("coach_threads").select("user_id, coach_last_read_at").in("user_id", ids),
      admin
        .from("coach_messages")
        .select("user_id, created_at, sender")
        .in("user_id", ids)
        .order("created_at", { ascending: false }),
    ]);

  if (planErr) {
    return NextResponse.json({ error: planErr.message }, { status: 500 });
  }
  if (threadErr) {
    return NextResponse.json({ error: threadErr.message }, { status: 500 });
  }
  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 500 });
  }

  const latestWeekByUser = new Map<string, string>();
  for (const row of planRows ?? []) {
    const uid = row.user_id as string;
    if (!latestWeekByUser.has(uid)) {
      latestWeekByUser.set(uid, row.week_start as string);
    }
  }

  const coachReadByUser = new Map<string, string | null>();
  for (const t of threads ?? []) {
    coachReadByUser.set(t.user_id as string, (t as { coach_last_read_at?: string | null }).coach_last_read_at ?? null);
  }

  const lastMsgAt = new Map<string, string>();
  const unreadFromUser = new Map<string, number>();
  const epoch = "1970-01-01T00:00:00.000Z";

  for (const row of msgs ?? []) {
    const uid = row.user_id as string;
    const created = row.created_at as string;
    if (!lastMsgAt.has(uid)) {
      lastMsgAt.set(uid, created);
    }
    if (row.sender === "user") {
      const readAfter = coachReadByUser.get(uid) ?? epoch;
      if (created > readAfter) {
        unreadFromUser.set(uid, (unreadFromUser.get(uid) ?? 0) + 1);
      }
    }
  }

  const clients = list.map((p) => ({
    ...p,
    latestWeekStart: latestWeekByUser.get(p.id) ?? null,
    lastMessageAt: lastMsgAt.get(p.id) ?? null,
    unreadFromUserCount: unreadFromUser.get(p.id) ?? 0,
  }));

  return NextResponse.json({ clients });
}
