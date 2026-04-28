"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type ClientRow = {
  id: string;
  subscription_tier: string;
  display_name: string | null;
  email: string | null;
  updated_at: string;
  latestWeekStart: string | null;
  lastMessageAt: string | null;
  unreadFromUserCount: number;
};

export function DashboardClients() {
  const [tier, setTier] = useState<"coaching" | "all">("coaching");
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (tier === "coaching") q.set("tier", "coaching");
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
  }, [tier, search]);

  useEffect(() => {
    const t = setTimeout(() => void load(), search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search, tier]);

  const emptyHint = useMemo(() => {
    if (tier === "coaching") {
      return "No coaching clients found. Clients appear here when their profile tier is set to coaching in the database.";
    }
    return "No profiles match this filter.";
  }, [tier]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-sm text-zinc-400">
          Tier{" "}
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as "coaching" | "all")}
            className="ml-1 bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1.5 text-zinc-100"
          >
            <option value="coaching">Coaching</option>
            <option value="all">All</option>
          </select>
        </label>
        <input
          type="search"
          placeholder="Search name, email, or id…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] max-w-md bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500"
        />
        <button
          type="button"
          onClick={() => void load()}
          className="text-sm px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-600"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : loading ? (
        <p className="text-zinc-500 text-sm">Loading…</p>
      ) : clients.length === 0 ? (
        <p className="text-zinc-500 text-sm">{emptyHint}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-900 text-zinc-400 uppercase text-xs">
              <tr>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2">Plan week</th>
                <th className="px-3 py-2">Last message</th>
                <th className="px-3 py-2 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-900/50">
                  <td className="px-3 py-2">
                    <div className="font-medium text-zinc-100">
                      {c.display_name || c.email || c.id.slice(0, 8) + "…"}
                    </div>
                    {c.email ? (
                      <div className="text-xs text-zinc-500">{c.email}</div>
                    ) : null}
                    {c.unreadFromUserCount > 0 ? (
                      <span className="inline-block mt-1 text-xs font-medium text-amber-400">
                        {c.unreadFromUserCount} unread from client
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-zinc-300">{c.subscription_tier}</td>
                  <td className="px-3 py-2 text-zinc-400 font-mono text-xs">
                    {c.latestWeekStart ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-400 text-xs">
                    {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/clients/${c.id}`}
                      className="text-amber-400 hover:text-amber-300 font-medium"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
