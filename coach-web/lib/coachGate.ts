/** Comma-separated Supabase `auth.users.id` values allowed to use the dashboard. */
export function getCoachAllowedIds(): Set<string> {
  const raw =
    process.env.COACH_ALLOWED_USER_IDS ?? process.env.COACH_USER_ID ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

export function isAllowedCoach(userId: string | undefined): boolean {
  if (!userId) return false;
  const allowed = getCoachAllowedIds();
  if (allowed.size === 0) {
    console.warn(
      "[coachGate] COACH_ALLOWED_USER_IDS / COACH_USER_ID is empty — blocking all coach API access."
    );
    return false;
  }
  return allowed.has(userId);
}
