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

/** Legacy allowlist (e.g. Jude) — skips intro-video gate when set. Empty = self-serve coaches only. */
export function isAllowedCoach(userId: string | undefined): boolean {
  if (!userId) return false;
  const allowed = getCoachAllowedIds();
  if (allowed.size === 0) return false;
  return allowed.has(userId);
}
