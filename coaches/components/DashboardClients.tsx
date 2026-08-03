"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ClientRow = {
  id: string;
  subscription_tier: string;
  display_name: string | null;
  email: string | null;
  updated_at: string;
  latestWeekStart: string | null;
  lastMessageAt: string | null;
  unreadFromUserCount: number;
  status?: string;
};

export function DashboardClients({ inviteCode }: { inviteCode?: string | null }) {
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimEmail, setClaimEmail] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (search.trim()) q.set("search", search.trim());
      const res = await fetch(`/api/clients?${q.toString()}`, { credentials: "include" });
      const json = (await res.json()) as { clients?: ClientRow[]; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to load");
        setClients([]);
        return;
      }
      setClients(json.clients ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => void load(), search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  async function claimClient(e: React.FormEvent) {
    e.preventDefault();
    setClaiming(true);
    setClaimMsg(null);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: claimEmail }),
      });
      const json = (await res.json()) as { error?: string; clientId?: string };
      if (!res.ok) {
        setClaimMsg(json.error ?? "Could not add client");
        return;
      }
      setClaimEmail("");
      setClaimMsg("Client added to your roster.");
      void load();
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="space-y-6">
      {inviteCode ? (
        <div className="border border-outline bg-surface-low p-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label-caps mb-1">Invite code</p>
            <p className="font-headline text-2xl font-black tracking-[0.2em] text-gold">
              {inviteCode}
            </p>
          </div>
          <p className="text-xs text-on-surface-variant max-w-xs">
            Clients enter this code in the Flight app to join you.
          </p>
        </div>
      ) : null}

      <form
        onSubmit={(e) => void claimClient(e)}
        className="border border-outline bg-surface-low p-4 space-y-3"
      >
        <p className="label-caps">Add existing Flight user</p>
        <div className="flex flex-wrap gap-2">
          <input
            type="email"
            required
            placeholder="client@email.com"
            value={claimEmail}
            onChange={(e) => setClaimEmail(e.target.value)}
            className="flex-1 min-w-[200px] bg-black border border-outline px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={claiming}
            className="px-4 py-2 bg-gold text-on-gold font-headline text-[10px] tracking-[0.15em] uppercase font-bold disabled:opacity-50"
          >
            {claiming ? "Adding…" : "Add to roster"}
          </button>
        </div>
        {claimMsg ? (
          <p className="text-xs text-on-surface-variant">{claimMsg}</p>
        ) : null}
      </form>

      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="search"
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] max-w-md bg-surface-low border border-outline px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void load()}
          className="label-caps text-on-surface-variant hover:text-gold"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-on-surface-variant">Loading…</p>
      ) : error ? (
        <p className="text-sm text-error">{error}</p>
      ) : clients.length === 0 ? (
        <p className="text-sm text-on-surface-variant">
          No clients yet. Share your invite code or add someone by email.
        </p>
      ) : (
        <ul className="divide-y divide-outline border border-outline">
          {clients.map((c) => (
            <li key={c.id}>
              <Link
                href={`/clients/${c.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-low transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-headline text-sm uppercase tracking-wide truncate">
                    {c.display_name || c.email || c.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-on-surface-variant truncate">
                    {c.email ?? "No email"}
                    {c.latestWeekStart ? ` · week ${c.latestWeekStart}` : ""}
                  </p>
                </div>
                {c.unreadFromUserCount > 0 ? (
                  <span className="shrink-0 text-[10px] font-headline tracking-wider uppercase bg-gold text-on-gold px-2 py-1">
                    {c.unreadFromUserCount} new
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
