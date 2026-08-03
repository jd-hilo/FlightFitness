import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedCoach } from "@/lib/coachGate";
import { EMPTY_ONBOARDING, type CoachOnboarding, type CoachRow } from "@/lib/coachTypes";

function parseOnboarding(raw: unknown): CoachOnboarding {
  if (!raw || typeof raw !== "object") return { ...EMPTY_ONBOARDING };
  return { ...EMPTY_ONBOARDING, ...(raw as CoachOnboarding) };
}

function mapCoach(row: Record<string, unknown>): CoachRow {
  return {
    user_id: String(row.user_id),
    display_name: (row.display_name as string | null) ?? null,
    bio: (row.bio as string | null) ?? null,
    intro_video_url: (row.intro_video_url as string | null) ?? null,
    intro_video_ready: Boolean(row.intro_video_ready),
    onboarding: parseOnboarding(row.onboarding),
    invite_code: (row.invite_code as string | null) ?? null,
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined,
  };
}

/** Ensure a coaches row exists (allowlisted Jude auto-provisioned; others on login). */
export async function ensureCoachRecord(
  userId: string,
  email?: string | null
): Promise<CoachRow | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: existing } = await admin
    .from("coaches")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const allowed = isAllowedCoach(userId);

  if (existing) {
    const coach = mapCoach(existing as Record<string, unknown>);
    if (allowed) await backfillLegacyThreadClients(userId);
    return coach;
  }

  const displayName =
    email?.split("@")[0]?.replace(/[._]/g, " ") ?? "Coach";

  const { data: created, error } = await admin
    .from("coaches")
    .insert({
      user_id: userId,
      display_name: displayName,
      bio: null,
      intro_video_ready: allowed, // legacy allowlist skips video gate for Jude cutover
      onboarding: {
        ...EMPTY_ONBOARDING,
        introVideo: allowed,
        profileComplete: allowed,
      },
    })
    .select("*")
    .single();

  if (error) {
    console.warn("[ensureCoachRecord]", error.message);
    return null;
  }

  const coach = mapCoach(created as Record<string, unknown>);
  if (allowed) {
    await backfillLegacyThreadClients(userId);
  }
  return coach;
}

/** Attach users with unscoped coach_threads to an allowlisted coach (Jude cutover). */
async function backfillLegacyThreadClients(coachId: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  const { data: threads } = await admin
    .from("coach_threads")
    .select("user_id")
    .is("coach_id", null);
  for (const t of threads ?? []) {
    const clientId = t.user_id as string;
    if (!clientId || clientId === coachId) continue;
    await admin.from("coach_clients").upsert(
      {
        coach_id: coachId,
        client_user_id: clientId,
        status: "active",
        source: "flight_assigned",
      },
      { onConflict: "coach_id,client_user_id" }
    );
    await admin
      .from("coach_threads")
      .update({ coach_id: coachId })
      .eq("user_id", clientId);
  }
}

export async function getCoachRecord(userId: string): Promise<CoachRow | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("coaches").select("*").eq("user_id", userId).maybeSingle();
  if (!data) return null;
  return mapCoach(data as Record<string, unknown>);
}

export async function patchCoachOnboarding(
  userId: string,
  patch: Partial<CoachOnboarding>
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  const coach = await getCoachRecord(userId);
  if (!coach) return;
  const onboarding = { ...coach.onboarding, ...patch };
  await admin
    .from("coaches")
    .update({ onboarding, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}
