import { NextRequest, NextResponse } from "next/server";

import { patchCoachOnboarding } from "@/lib/coachProvision";
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
  const auth = await requireCoach({ requireIntroVideo: true });
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  if (!admin) return adminServiceUnavailable();

  const search = request.nextUrl.searchParams.get("search")?.trim().toLowerCase();

  const { data: links, error: linkErr } = await admin
    .from("coach_clients")
    .select("client_user_id, status, source, created_at")
    .eq("coach_id", auth.userId)
    .in("status", ["active", "invited"]);

  if (linkErr) {
    return NextResponse.json({ error: linkErr.message }, { status: 500 });
  }

  const ids = (links ?? []).map((l) => l.client_user_id as string);
  if (ids.length === 0) {
    return NextResponse.json({ clients: [] });
  }

  const { data: profiles, error } = await admin
    .from("profiles")
    .select(
      "id, onboarding_json, subscription_tier, display_name, email, first_name, updated_at"
    )
    .in("id", ids)
    .order("updated_at", { ascending: false });

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

  const [{ data: planRows }, { data: threads }, { data: msgs }] = await Promise.all([
    admin
      .from("plans")
      .select("user_id, week_start, created_at")
      .in("user_id", ids)
      .order("created_at", { ascending: false }),
    admin
      .from("coach_threads")
      .select("user_id, coach_last_read_at")
      .eq("coach_id", auth.userId)
      .in("user_id", ids),
    admin
      .from("coach_messages")
      .select("user_id, created_at, sender")
      .eq("coach_id", auth.userId)
      .in("user_id", ids)
      .order("created_at", { ascending: false }),
  ]);

  const latestWeekByUser = new Map<string, string>();
  for (const row of planRows ?? []) {
    const uid = row.user_id as string;
    if (!latestWeekByUser.has(uid)) {
      latestWeekByUser.set(uid, row.week_start as string);
    }
  }

  const coachReadByUser = new Map<string, string | null>();
  for (const t of threads ?? []) {
    coachReadByUser.set(
      t.user_id as string,
      (t as { coach_last_read_at?: string | null }).coach_last_read_at ?? null
    );
  }

  const lastMsgAt = new Map<string, string>();
  const unreadFromUser = new Map<string, number>();
  const epoch = "1970-01-01T00:00:00.000Z";

  for (const row of msgs ?? []) {
    const uid = row.user_id as string;
    const created = row.created_at as string;
    if (!lastMsgAt.has(uid)) lastMsgAt.set(uid, created);
    if (row.sender === "user") {
      const readAfter = coachReadByUser.get(uid) ?? epoch;
      if (created > readAfter) {
        unreadFromUser.set(uid, (unreadFromUser.get(uid) ?? 0) + 1);
      }
    }
  }

  const linkByClient = new Map(
    (links ?? []).map((l) => [l.client_user_id as string, l])
  );

  const clients = list.map((p) => ({
    ...p,
    status: (linkByClient.get(p.id)?.status as string) ?? "active",
    source: (linkByClient.get(p.id)?.source as string) ?? "coach_brought",
    latestWeekStart: latestWeekByUser.get(p.id) ?? null,
    lastMessageAt: lastMsgAt.get(p.id) ?? null,
    unreadFromUserCount: unreadFromUser.get(p.id) ?? 0,
  }));

  return NextResponse.json({ clients });
}

/** Claim an existing Flight user by email onto this coach's roster. */
export async function POST(request: NextRequest) {
  const auth = await requireCoach({ requireIntroVideo: true });
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  if (!admin) return adminServiceUnavailable();

  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, display_name")
    .ilike("email", email)
    .maybeSingle();

  if (!profile?.id) {
    return NextResponse.json(
      { error: "No Flight user with that email. Have them create an account first." },
      { status: 404 }
    );
  }

  const { error } = await admin.from("coach_clients").upsert(
    {
      coach_id: auth.userId,
      client_user_id: profile.id,
      status: "active",
      source: "flight_assigned",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "coach_id,client_user_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin
    .from("profiles")
    .update({ subscription_tier: "coaching" })
    .eq("id", profile.id);

  await patchCoachOnboarding(auth.userId, { firstClient: true });

  return NextResponse.json({ ok: true, clientId: profile.id });
}
