import { NextResponse } from "next/server";

import { isAllowedCoach } from "@/lib/coachGate";
import { isSupabasePublicConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type CoachAuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

export async function requireCoach(): Promise<CoachAuthResult> {
  if (!isSupabasePublicConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Server misconfigured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in coach-web/.env.local.",
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

  if (!isAllowedCoach(user.id)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, userId: user.id };
}
