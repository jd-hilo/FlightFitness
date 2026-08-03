import { NextResponse } from "next/server";

import { ensureCoachRecord, getCoachRecord } from "@/lib/coachProvision";
import type { CoachRow } from "@/lib/coachTypes";
import { isSupabasePublicConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type CoachAuthResult =
  | { ok: true; userId: string; coach: CoachRow }
  | { ok: false; response: NextResponse };

export async function requireCoach(_opts?: {
  /** @deprecated Video is optional; checklist-only on Home. Kept for call-site compat. */
  requireIntroVideo?: boolean;
}): Promise<CoachAuthResult> {
  if (!isSupabasePublicConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Server misconfigured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in coaches/.env.local.",
        },
        { status: 503 }
      ),
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Supabase client unavailable." }, { status: 503 }),
    };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  let coach = await getCoachRecord(user.id);
  if (!coach) {
    coach = await ensureCoachRecord(user.id, user.email);
  }
  if (!coach) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, userId: user.id, coach };
}
