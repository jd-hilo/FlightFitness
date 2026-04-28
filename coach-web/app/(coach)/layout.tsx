import { redirect } from "next/navigation";

import { CoachShell } from "@/components/CoachShell";
import { isSupabasePublicConfigured } from "@/lib/supabase/config";
import { isAllowedCoach } from "@/lib/coachGate";
import { createClient } from "@/lib/supabase/server";

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabasePublicConfigured()) {
    redirect("/setup");
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect("/setup");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  if (!isAllowedCoach(user.id)) {
    redirect("/login?error=forbidden");
  }
  return <CoachShell>{children}</CoachShell>;
}
