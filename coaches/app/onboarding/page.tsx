import { redirect } from "next/navigation";

import { CoachOnboardingWizard } from "@/components/CoachOnboardingWizard";
import { isCoachSetupComplete } from "@/lib/coachSetup";
import { ensureCoachRecord } from "@/lib/coachProvision";
import { isSupabasePublicConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  if (!isSupabasePublicConfigured()) redirect("/setup");
  const supabase = await createClient();
  if (!supabase) redirect("/setup");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const coach = await ensureCoachRecord(user.id, user.email);
  if (!coach) redirect("/login?error=forbidden");
  if (isCoachSetupComplete(coach)) redirect("/dashboard");

  return <CoachOnboardingWizard coach={coach} />;
}
