"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "flight-coach-checklist-dismissed";

export function FirstRunChecklist() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  return (
    <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
      <div className="flex justify-between gap-4 items-start">
        <div>
          <p className="font-semibold text-amber-200 mb-2">Welcome — quick start</p>
          <ol className="list-decimal list-inside space-y-1 text-zinc-200">
            <li>
              Review your <Link className="text-amber-400 underline" href="/dashboard">client list</Link>.
            </li>
            <li>Open a client and scan their profile and current week plan.</li>
            <li>Edit a meal or workout, then click Save plan.</li>
            <li>
              Send a message from the{" "}
              <Link className="text-amber-400 underline" href="/messages">Messages</Link> tab or the client&apos;s Messages tab.
            </li>
          </ol>
        </div>
        <button
          type="button"
          className="shrink-0 text-xs font-medium px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          onClick={() => {
            try {
              localStorage.setItem(STORAGE_KEY, "1");
            } catch {
              /* ignore */
            }
            setDismissed(true);
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
