import { redirect } from "next/navigation";

import {
  CoachDashboard,
  type DashboardActivity,
  type DashboardClient,
} from "@/components/CoachDashboard";
import { ensureCoachRecord } from "@/lib/coachProvision";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/setup");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const coach = await ensureCoachRecord(user.id, user.email);
  if (!coach) redirect("/login?error=forbidden");

  const admin = createAdminClient();
  let clients: DashboardClient[] = [];
  let unread = 0;
  let activity: DashboardActivity[] = [];

  if (admin) {
    const { data: links } = await admin
      .from("coach_clients")
      .select("client_user_id, status, source")
      .eq("coach_id", user.id)
      .in("status", ["active", "invited"]);

    const ids = (links ?? []).map((l) => l.client_user_id as string);
    const linkById = new Map(
      (links ?? []).map((l) => [l.client_user_id as string, l])
    );

    if (ids.length) {
      const [{ data: profiles }, { data: planRows }, { data: threads }, { data: msgs }] =
        await Promise.all([
          admin
            .from("profiles")
            .select("id, display_name, email, subscription_tier, updated_at")
            .in("id", ids)
            .order("updated_at", { ascending: false }),
          admin
            .from("plans")
            .select("user_id, week_start, created_at")
            .in("user_id", ids)
            .order("created_at", { ascending: false }),
          admin
            .from("coach_threads")
            .select("user_id, coach_last_read_at")
            .eq("coach_id", user.id)
            .in("user_id", ids),
          admin
            .from("coach_messages")
            .select("id, user_id, sender, body, created_at")
            .eq("coach_id", user.id)
            .in("user_id", ids)
            .order("created_at", { ascending: false })
            .limit(40),
        ]);

      const latestWeek = new Map<string, string>();
      for (const row of planRows ?? []) {
        const uid = row.user_id as string;
        if (!latestWeek.has(uid)) latestWeek.set(uid, row.week_start as string);
      }

      const readMap = new Map(
        (threads ?? []).map((t) => [
          t.user_id as string,
          (t.coach_last_read_at as string | null) ?? "1970-01-01T00:00:00.000Z",
        ])
      );

      const lastMsgAt = new Map<string, string>();
      const unreadByUser = new Map<string, number>();
      for (const m of msgs ?? []) {
        const uid = m.user_id as string;
        const created = m.created_at as string;
        if (!lastMsgAt.has(uid)) lastMsgAt.set(uid, created);
        if (m.sender === "user") {
          const readAfter = readMap.get(uid) ?? "1970-01-01T00:00:00.000Z";
          if (created > readAfter) {
            unreadByUser.set(uid, (unreadByUser.get(uid) ?? 0) + 1);
            unread += 1;
          }
        }
      }

      const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));

      clients = ids.map((id) => {
        const p = profileById.get(id);
        return {
          id,
          display_name: (p?.display_name as string | null) ?? null,
          email: (p?.email as string | null) ?? null,
          subscription_tier: (p?.subscription_tier as string) ?? "free",
          lastMessageAt: lastMsgAt.get(id) ?? null,
          unreadFromUserCount: unreadByUser.get(id) ?? 0,
          latestWeekStart: latestWeek.get(id) ?? null,
          status: (linkById.get(id)?.status as string) ?? "active",
        };
      });

      clients.sort((a, b) => {
        const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return tb - ta;
      });

      activity = (msgs ?? []).slice(0, 8).map((m) => {
        const uid = m.user_id as string;
        const p = profileById.get(uid);
        return {
          id: m.id as string,
          clientId: uid,
          clientLabel:
            (p?.display_name as string | null) ||
            (p?.email as string | null) ||
            `${uid.slice(0, 8)}…`,
          body: (m.body as string) ?? "",
          created_at: m.created_at as string,
          sender: m.sender as string,
        };
      });
    }
  }

  return (
    <CoachDashboard
      coach={coach}
      clients={clients}
      unread={unread}
      activity={activity}
    />
  );
}
