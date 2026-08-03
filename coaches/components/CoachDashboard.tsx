import Link from "next/link";

import { SetupGuide } from "@/components/SetupGuide";
import type { CoachRow } from "@/lib/coachTypes";

export type DashboardClient = {
  id: string;
  display_name: string | null;
  email: string | null;
  subscription_tier: string;
  lastMessageAt: string | null;
  unreadFromUserCount: number;
  latestWeekStart: string | null;
  status: string;
};

export type DashboardActivity = {
  id: string;
  clientId: string;
  clientLabel: string;
  body: string;
  created_at: string;
  sender: string;
};

function labelFor(c: Pick<DashboardClient, "display_name" | "email" | "id">) {
  return c.display_name || c.email || `${c.id.slice(0, 8)}…`;
}

function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function CoachDashboard({
  coach,
  clients,
  unread,
  activity,
}: {
  coach: CoachRow;
  clients: DashboardClient[];
  unread: number;
  activity: DashboardActivity[];
}) {
  const withPlan = clients.filter((c) => c.latestWeekStart).length;
  const needsAttention = clients.filter((c) => c.unreadFromUserCount > 0);

  return (
    <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-8 lg:items-start space-y-8 lg:space-y-0">
      {/* Main ops surface */}
      <div className="space-y-8 min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-caps mb-2">Dashboard</p>
            <h1 className="font-headline text-3xl sm:text-4xl font-black uppercase tracking-tight">
              {coach.display_name ?? "Coach"}
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Your roster, messages, and week pulse in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/clients"
              className="px-4 py-2.5 bg-gold text-on-gold font-headline text-[10px] tracking-[0.15em] uppercase font-bold hover:bg-gold-dim"
            >
              Clients
            </Link>
            <Link
              href="/messages"
              className="px-4 py-2.5 border border-outline font-headline text-[10px] tracking-[0.15em] uppercase font-bold text-on-surface-variant hover:border-gold hover:text-gold"
            >
              Inbox
            </Link>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-outline border border-outline">
          {[
            { label: "Active clients", value: String(clients.length), href: "/clients" },
            { label: "Unread", value: String(unread), href: "/messages" },
            { label: "With a plan", value: String(withPlan), href: "/clients" },
            {
              label: "Need reply",
              value: String(needsAttention.length),
              href: "/messages",
            },
          ].map((k) => (
            <Link
              key={k.label}
              href={k.href}
              className="bg-black p-4 sm:p-5 hover:bg-surface-low transition-colors"
            >
              <p className="label-caps mb-2">{k.label}</p>
              <p className="font-headline text-3xl font-black text-gold tabular-nums">
                {k.value}
              </p>
            </Link>
          ))}
        </div>

        {/* Invite + quick actions */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="border border-outline bg-surface-low p-5">
            <p className="label-caps mb-2">Invite code</p>
            <p className="font-headline text-2xl sm:text-3xl font-black tracking-[0.18em] text-gold">
              {coach.invite_code ?? "—"}
            </p>
            <p className="mt-2 text-xs text-on-surface-variant leading-relaxed">
              Clients enter this under Custom Coaching in the Flight app.
            </p>
          </div>
          <div className="border border-outline p-5 space-y-3">
            <p className="label-caps">Quick actions</p>
            <Link
              href="/clients"
              className="block font-headline text-xs uppercase tracking-wider text-on-background hover:text-gold"
            >
              Add or claim a client →
            </Link>
            <Link
              href="/messages"
              className="block font-headline text-xs uppercase tracking-wider text-on-background hover:text-gold"
            >
              Open message inbox →
            </Link>
            <Link
              href="/settings"
              className="block font-headline text-xs uppercase tracking-wider text-on-background hover:text-gold"
            >
              Edit profile & video →
            </Link>
          </div>
        </div>

        {/* Roster preview */}
        <section>
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <h2 className="font-headline text-sm font-black uppercase tracking-wider">
              Roster
            </h2>
            <Link
              href="/clients"
              className="text-[10px] font-headline tracking-[0.15em] uppercase text-gold hover:text-gold-dim"
            >
              View all
            </Link>
          </div>
          {clients.length === 0 ? (
            <div className="border border-dashed border-outline px-5 py-10 text-center">
              <p className="font-headline text-sm uppercase tracking-wide text-on-surface-variant">
                No clients yet
              </p>
              <p className="mt-2 text-xs text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                Share your invite code or add someone by email from Clients.
              </p>
              <Link
                href="/clients"
                className="inline-block mt-5 px-5 py-2.5 border border-gold text-gold font-headline text-[10px] tracking-[0.15em] uppercase font-bold hover:bg-gold/10"
              >
                Open clients
              </Link>
            </div>
          ) : (
            <div className="border border-outline overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-outline text-[10px] font-headline uppercase tracking-wider text-on-surface-variant">
                    <th className="px-4 py-3 font-bold">Client</th>
                    <th className="px-4 py-3 font-bold hidden sm:table-cell">Plan week</th>
                    <th className="px-4 py-3 font-bold hidden md:table-cell">Last message</th>
                    <th className="px-4 py-3 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline">
                  {clients.slice(0, 8).map((c) => (
                    <tr key={c.id} className="hover:bg-surface-low/80 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/clients/${c.id}`}
                          className="font-medium text-on-background hover:text-gold"
                        >
                          {labelFor(c)}
                        </Link>
                        {c.unreadFromUserCount > 0 ? (
                          <span className="ml-2 text-[10px] text-gold font-headline uppercase tracking-wider">
                            {c.unreadFromUserCount} new
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant text-xs hidden sm:table-cell">
                        {c.latestWeekStart ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant text-xs hidden md:table-cell">
                        {timeAgo(c.lastMessageAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[10px] font-headline uppercase tracking-wider text-on-surface-variant">
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Activity */}
        <section>
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <h2 className="font-headline text-sm font-black uppercase tracking-wider">
              Recent messages
            </h2>
            <Link
              href="/messages"
              className="text-[10px] font-headline tracking-[0.15em] uppercase text-gold hover:text-gold-dim"
            >
              Inbox
            </Link>
          </div>
          {activity.length === 0 ? (
            <p className="text-sm text-on-surface-variant border border-outline px-4 py-6">
              No messages yet. When a client writes you, it shows up here.
            </p>
          ) : (
            <ul className="border border-outline divide-y divide-outline">
              {activity.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/clients/${a.clientId}?tab=messages`}
                    className="block px-4 py-3.5 hover:bg-surface-low/80 transition-colors"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-headline text-[11px] uppercase tracking-wider text-gold">
                        {a.clientLabel}
                      </p>
                      <p className="text-[10px] text-on-surface-variant shrink-0">
                        {timeAgo(a.created_at)}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-on-surface-variant line-clamp-2">
                      <span className="text-on-background/80">
                        {a.sender === "coach" ? "You: " : ""}
                      </span>
                      {a.body}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Right rail */}
      <div className="space-y-4 lg:max-w-[280px]">
        <SetupGuide coach={coach} />
        {coach.bio ? (
          <div className="border border-outline p-4">
            <p className="label-caps mb-2">Your bio</p>
            <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-4">
              {coach.bio}
            </p>
            <Link
              href="/settings"
              className="inline-block mt-3 text-[10px] font-headline tracking-[0.15em] uppercase text-gold"
            >
              Edit →
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
