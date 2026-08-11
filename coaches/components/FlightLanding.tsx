"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const PILLARS = [
  {
    key: "train",
    label: "Train",
    title: "Serious strength programming",
    body: "Built for progressive training — sessions, supersets, notes, and rest that belong in a real strength plan, not a random workout feed.",
  },
  {
    key: "fuel",
    label: "Fuel",
    title: "Meals that match the work",
    body: "Fuel the lift. Weekly meals and macros sit next to training so clients stop guessing what to eat on heavy days.",
  },
  {
    key: "faith",
    label: "Faith",
    title: "Faith is the foundation",
    body: "Daily scripture, reflection, and coach prompts. Strength training that doesn’t leave the soul on the sideline.",
  },
  {
    key: "coach",
    label: "Coach",
    title: "A coach in their corner",
    body: "Push the week, message clients, and assign reflections — all inside the same app they open to train.",
  },
] as const;

const HOW = [
  {
    step: "01",
    title: "Create your coach profile",
    body: "Sign in with email. Add your name and bio so clients know who they’re training with.",
  },
  {
    step: "02",
    title: "Invite your clients",
    body: "Share your invite code. They join Flight and land on your roster.",
  },
  {
    step: "03",
    title: "Push the week",
    body: "Build workouts, meals, and reflections. Monday morning, it’s already in their app.",
  },
] as const;

export function FlightLanding() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="relative min-h-screen bg-black text-on-background overflow-x-hidden">
      <section className="relative min-h-[100svh] flex flex-col">
        <div className="absolute inset-0">
          <Image
            src="/home-hero.jpg"
            alt=""
            fill
            priority
            className="object-cover object-[center_22%] opacity-55"
            sizes="100vw"
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 35%, rgba(0,0,0,0.82) 72%, #000 100%), radial-gradient(ellipse 70% 45% at 50% 0%, rgba(255,215,0,0.14), transparent 55%)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />
        </div>

        <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5 max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <Image
              src="/header-logo.png"
              alt="Flight Fitness"
              width={36}
              height={36}
              className="brightness-0 invert"
              priority
            />
            <span className="font-headline text-[11px] sm:text-xs tracking-[0.28em] text-gold uppercase font-black">
              Flight Fitness
            </span>
          </div>
          <Link
            href="/login"
            className="label-caps text-on-surface-variant hover:text-gold transition-colors duration-300"
          >
            Sign in
          </Link>
        </header>

        <main className="relative z-10 flex-1 flex flex-col justify-end px-6 sm:px-10 pb-16 sm:pb-20 max-w-6xl mx-auto w-full">
          <div
            className={`max-w-2xl transition-all duration-1000 ease-out ${
              ready ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <p className="label-caps mb-4">Flight Fitness</p>
            <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl font-black italic uppercase tracking-tight text-gold leading-[0.95] max-w-xl">
              Where faith
              <br />
              meets fitness
            </h1>
            <p
              className={`mt-5 max-w-lg text-sm sm:text-[15px] text-on-surface-variant leading-relaxed transition-all duration-1000 delay-150 ease-out ${
                ready ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              The ultimate strength app for faith-based training — hard training,
              real fuel, and a walk with God in one place. Coach your people inside
              Flight.
            </p>
            <div
              className={`mt-9 flex flex-col sm:flex-row gap-3 transition-all duration-1000 delay-300 ease-out ${
                ready ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <Link
                href="/login"
                className="group inline-flex items-center justify-center px-9 py-4 bg-gold text-on-gold font-headline text-[11px] tracking-[0.18em] uppercase font-bold hover:bg-gold-dim transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                Coach with Flight
                <span className="ml-2 transition-transform duration-300 group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
              <a
                href="#pillars"
                className="inline-flex items-center justify-center px-9 py-4 border border-white/25 text-on-background font-headline text-[11px] tracking-[0.18em] uppercase font-bold hover:border-gold hover:text-gold transition-colors duration-300"
              >
                See the app
              </a>
            </div>
          </div>
        </main>
      </section>

      <section
        id="pillars"
        className="relative border-t border-outline px-6 sm:px-10 py-20 sm:py-28"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 50% 40% at 0% 20%, rgba(255,215,0,0.06), transparent 50%)",
          }}
        />
        <div className="relative max-w-6xl mx-auto">
          <p className="label-caps mb-3">The app</p>
          <h2 className="font-headline text-3xl sm:text-4xl font-black uppercase tracking-tight max-w-2xl leading-tight">
            Strength training built for believers who lift
          </h2>
          <p className="mt-4 max-w-lg text-sm text-on-surface-variant leading-relaxed">
            Flight is not a watered-down habit tracker. It’s Train, Fuel, and Faith —
            the stack serious athletes of faith actually use.
          </p>

          <ul className="mt-14 divide-y divide-outline border-y border-outline">
            {PILLARS.map((p, i) => (
              <li
                key={p.key}
                className="group grid sm:grid-cols-[140px_1fr] gap-3 sm:gap-10 py-8 sm:py-10"
              >
                <span className="font-headline text-4xl sm:text-5xl font-black italic uppercase text-gold/90 tracking-tight transition-transform duration-500 group-hover:translate-x-1">
                  {p.label}
                </span>
                <div>
                  <h3 className="font-headline text-base sm:text-lg font-black uppercase tracking-wide text-on-background">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm text-on-surface-variant leading-relaxed max-w-xl">
                    {p.body}
                  </p>
                  <span className="mt-3 inline-block text-[10px] font-headline tracking-[0.2em] uppercase text-on-surface-variant/60">
                    0{i + 1}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative border-t border-outline px-6 sm:px-10 py-20 sm:py-28 bg-surface-low/40">
        <div className="max-w-6xl mx-auto">
          <p className="label-caps mb-3">For coaches</p>
          <h2 className="font-headline text-3xl sm:text-4xl font-black uppercase tracking-tight max-w-xl leading-tight">
            Put your clients in Flight
          </h2>
          <p className="mt-4 max-w-md text-sm text-on-surface-variant leading-relaxed">
            Stop running coaching out of spreadsheets and group chats. Program
            strength. Feed the work. Keep faith in the week.
          </p>

          <ol className="mt-14 grid md:grid-cols-3 gap-0 border border-outline">
            {HOW.map((h, i) => (
              <li
                key={h.step}
                className={`p-8 sm:p-10 ${
                  i < HOW.length - 1 ? "border-b md:border-b-0 md:border-r border-outline" : ""
                }`}
              >
                <span className="font-headline text-gold text-sm tracking-[0.25em] font-black">
                  {h.step}
                </span>
                <h3 className="mt-4 font-headline text-base font-black uppercase tracking-wide">
                  {h.title}
                </h3>
                <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">
                  {h.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="relative border-t border-outline px-6 sm:px-10 py-24 sm:py-32 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(255,215,0,0.1), transparent 55%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <Image
            src="/icon.png"
            alt=""
            width={56}
            height={56}
            className="mx-auto mb-8 opacity-90"
          />
          <h2 className="font-headline text-3xl sm:text-5xl font-black italic uppercase tracking-tight text-gold leading-none">
            Faith-based. Strength-first.
          </h2>
          <p className="mt-5 text-sm sm:text-base text-on-surface-variant leading-relaxed max-w-md mx-auto">
            Invite your first client. Push Monday’s session. Let them train where
            faith and fitness actually meet.
          </p>
          <Link
            href="/login"
            className="mt-10 inline-flex items-center justify-center px-10 py-4 bg-gold text-on-gold font-headline text-[11px] tracking-[0.18em] uppercase font-bold hover:bg-gold-dim transition-all duration-300 hover:scale-[1.02]"
          >
            Start coaching
          </Link>
        </div>
      </section>

      <footer className="border-t border-outline px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-6xl mx-auto w-full">
        <span className="font-headline text-[10px] tracking-[0.25em] uppercase text-on-surface-variant">
          Flight Fitness · Coaches
        </span>
        <Link
          href="/login"
          className="text-[10px] font-headline tracking-[0.2em] uppercase text-gold hover:text-gold-dim"
        >
          Sign in
        </Link>
      </footer>
    </div>
  );
}
