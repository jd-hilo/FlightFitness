import { DashboardClients } from "@/components/DashboardClients";
import { FirstRunChecklist } from "@/components/FirstRunChecklist";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Clients</h1>
      <p className="text-zinc-400 text-sm mb-6">
        Coaching-tier athletes and their latest plan week.
      </p>
      <FirstRunChecklist />
      <DashboardClients />
    </div>
  );
}
