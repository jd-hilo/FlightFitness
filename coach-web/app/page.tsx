import { redirect } from "next/navigation";

import { isSupabasePublicConfigured } from "@/lib/supabase/config";
import { isAllowedCoach } from "@/lib/coachGate";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
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
  redirect("/dashboard");
}
