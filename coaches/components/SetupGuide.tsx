"use client";

import Link from "next/link";
import { useMemo } from "react";

import type { CoachOnboarding, CoachRow } from "@/lib/coachTypes";

const ITEMS: {
  key: keyof CoachOnboarding;
  label: string;
  href?: string;
}[] = [
  { key: "profileComplete", label: "Profile", href: "/settings" },
  { key: "introVideo", label: "Intro video", href: "/settings" },
  { key: "firstClient", label: "First client", href: "/clients" },
  { key: "firstPlan", label: "Push a week plan", href: "/clients" },
  { key: "firstReflection", label: "Reflection prompt", href: "/clients" },
  { key: "firstMessage", label: "First message", href: "/messages" },
];

/** Compact right-rail guide — not the main dashboard. */
export function SetupGuide({ coach }: { coach: CoachRow }) {
  const doneCount = useMemo(
    () => ITEMS.filter((i) => Boolean(coach.onboarding[i.key])).length,
    [coach.onboarding]
  );
  const allDone = doneCount === ITEMS.length;
  if (allDone) return null;

  const pct = Math.round((doneCount / ITEMS.length) * 100);

  return (
    <aside className="border border-outline bg-surface-low/80 p-4 sticky top-20">
      <p className="label-caps mb-1">Getting started</p>
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <p className="font-headline text-sm font-black uppercase tracking-wide">
          {doneCount}/{ITEMS.length}
        </p>
        <p className="text-[10px] text-on-surface-variant font-headline tracking-wider uppercase">
          {pct}%
        </p>
      </div>
      <div className="h-1 w-full bg-black mb-4">
        <div className="h-1 bg-gold transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <ul className="space-y-2">
        {ITEMS.map((item) => {
          const done = Boolean(coach.onboarding[item.key]);
          const row = (
            <span
              className={`flex items-center gap-2 text-xs ${
                done ? "text-on-surface-variant/50 line-through" : "text-on-background"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 ${done ? "bg-gold" : "bg-outline"}`}
              />
              {item.label}
            </span>
          );
          return (
            <li key={item.key}>
              {done || !item.href ? (
                row
              ) : (
                <Link href={item.href} className="hover:text-gold transition-colors block">
                  {row}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[10px] text-on-surface-variant leading-relaxed">
        Optional guide — your roster is open whenever you&apos;re ready.
      </p>
    </aside>
  );
}
