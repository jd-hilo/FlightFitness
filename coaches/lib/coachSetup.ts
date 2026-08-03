import type { CoachRow } from "@/lib/coachTypes";

/** Name + bio required before the portal. Intro video is optional (can skip). */
export function isCoachSetupComplete(coach: CoachRow): boolean {
  return Boolean(coach.display_name?.trim() && coach.bio?.trim());
}
