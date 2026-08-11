import { redirect } from "next/navigation";

import { DashboardClients } from "@/components/DashboardClients";
import { ensureCoachRecord } from "@/lib/coachProvision";
import { createClient } from "@/lib/supabase/server";

export default async function ClientsPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/setup");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const coach = await ensureCoachRecord(user.id, user.email);
  if (!coach) redirect("/login?error=forbidden");

  return (
    <div className="space-y-6">
      <div>
        <p className="label-caps mb-2">Roster</p>
        <h1 className="font-headline text-3xl font-black uppercase tracking-tight">
          Clients
        </h1>
      </div>
      <DashboardClients inviteCode={coach.invite_code} />
    </div>
  );
}
