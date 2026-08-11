"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/dashboard", label: "Home" },
  { href: "/clients", label: "Clients" },
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
    <div className="min-h-screen flex flex-col bg-black text-on-background">
      <header className="border-b border-outline sticky top-0 z-10 bg-black/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 shrink-0"
            >
              <Image
                src="/header-logo.png"
                alt="Flight Fitness"
                width={28}
                height={28}
                className="brightness-0 invert"
                priority
              />
              <span className="font-headline text-[11px] sm:text-xs font-black italic text-gold uppercase tracking-[0.22em]">
                Flight
              </span>
            </Link>
            <nav className="flex gap-1 overflow-x-auto">
              {links.map((l) => {
                const active =
                  l.href === "/clients"
                    ? pathname?.startsWith("/clients")
                    : pathname === l.href ||
                      (l.href === "/dashboard" && pathname === "/dashboard");
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`px-3 py-1.5 text-xs font-headline tracking-wider uppercase transition-colors ${
                      active
                        ? "text-gold border-b border-gold"
                        : "text-on-surface-variant hover:text-on-background"
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
            className="label-caps text-on-surface-variant hover:text-gold shrink-0"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
