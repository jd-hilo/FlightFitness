import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function assertCoachOwnsClient(
  admin: SupabaseClient,
  coachId: string,
  clientUserId: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const { data, error } = await admin
    .from("coach_clients")
    .select("id")
    .eq("coach_id", coachId)
    .eq("client_user_id", clientUserId)
    .in("status", ["active", "invited"])
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      response: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }
  if (!data) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Client not on your roster" }, { status: 403 }),
    };
  }
  return { ok: true };
}
