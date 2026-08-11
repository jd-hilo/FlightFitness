import { redirect } from "next/navigation";

import { CoachSettingsForm } from "@/components/CoachSettingsForm";
import { ensureCoachRecord } from "@/lib/coachProvision";
import { isSupabasePublicConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  if (!isSupabasePublicConfigured()) redirect("/setup");
  const supabase = await createClient();
  if (!supabase) redirect("/setup");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const coach = await ensureCoachRecord(user.id, user.email);
  if (!coach) redirect("/login?error=forbidden");

  return (
    <div>
      <h1 className="font-headline text-2xl font-black uppercase tracking-tight text-on-background mb-1">
        Settings
      </h1>
      <p className="text-on-surface-variant text-sm mb-6">
        Profile and intro video for your Flight coaching practice.
      </p>
      <CoachSettingsForm coach={coach} />
    </div>
  );
}
