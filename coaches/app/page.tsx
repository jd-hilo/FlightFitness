import { redirect } from "next/navigation";

import { FlightLanding } from "@/components/FlightLanding";
import { isCoachSetupComplete } from "@/lib/coachSetup";
import { ensureCoachRecord } from "@/lib/coachProvision";
import { isSupabasePublicConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  if (isSupabasePublicConfigured()) {
    const supabase = await createClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const coach = await ensureCoachRecord(user.id, user.email);
        if (coach) {
          redirect(isCoachSetupComplete(coach) ? "/dashboard" : "/onboarding");
        }
      }
    }
  }

  return <FlightLanding />;
}
