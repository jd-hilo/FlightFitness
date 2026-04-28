"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type ClientRow = {
  id: string;
  subscription_tier: string;
  display_name: string | null;
  email: string | null;
  lastMessageAt: string | null;
  unreadFromUserCount: number;
};

export function MessagesInbox() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/clients?tier=all", { credentials: "include" });
      const json = (await res.json()) as { clients?: ClientRow[]; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to load");
        setClients([]);
        return;
      }
      setClients(json.clients ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(() => {
    return [...clients].sort((a, b) => {
      const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return tb - ta;
    });
  }, [clients]);

  const withActivity = sorted.filter((c) => c.lastMessageAt || c.unreadFromUserCount > 0);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => void load()}
        className="text-sm px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-600"
      >
        Refresh
      </button>
      {error ? <p className="text-red-400 text-sm">{error}</p> : null}
      {loading ? (
        <p className="text-zinc-500 text-sm">Loading…</p>
      ) : withActivity.length === 0 ? (
        <p className="text-zinc-500 text-sm">
          No message threads yet. When clients on the coaching tier send messages, they will appear here.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800 rounded-lg border border-zinc-800 bg-zinc-900/40">
          {withActivity.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-900/80">
              <div>
                <div className="font-medium text-zinc-100">
                  {c.display_name || c.email || c.id.slice(0, 8) + "…"}
                </div>
                <div className="text-xs text-zinc-500">
                  {c.lastMessageAt ? `Last message ${new Date(c.lastMessageAt).toLocaleString()}` : "No messages"}
                </div>
                {c.unreadFromUserCount > 0 ? (
                  <span className="text-xs font-medium text-amber-400 mt-1 inline-block">
                    {c.unreadFromUserCount} unread from client
                  </span>
                ) : null}
              </div>
              <Link
                href={`/clients/${c.id}?tab=messages`}
                className="text-sm font-medium text-amber-400 hover:text-amber-300 shrink-0"
              >
                Open thread
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
