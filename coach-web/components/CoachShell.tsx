"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/dashboard", label: "Clients" },
  { href: "/messages", label: "Messages" },
  { href: "/settings", label: "Settings" },
];

export function CoachShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  async function signOut() {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold text-amber-400 tracking-tight">
              Flight Coach
            </Link>
            <nav className="flex gap-1">
              {links.map((l) => {
                const active =
                  l.href === "/dashboard"
                    ? pathname === "/dashboard" || pathname?.startsWith("/clients")
                    : pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? "bg-zinc-800 text-amber-300"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="text-sm text-zinc-400 hover:text-zinc-200"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
