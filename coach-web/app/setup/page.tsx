import Link from "next/link";

import { isServiceRoleConfigured, isSupabasePublicConfigured } from "@/lib/supabase/config";

export default function SetupPage() {
  const publicOk = isSupabasePublicConfigured();
  const adminOk = isServiceRoleConfigured();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-12">
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-amber-400">Configure coach-web</h1>
        <p className="text-sm text-zinc-400">
          Create{" "}
          <code className="text-amber-300/90 bg-zinc-900 px-1.5 py-0.5 rounded">coach-web/.env.local</code>{" "}
          from{" "}
          <code className="text-amber-300/90 bg-zinc-900 px-1.5 py-0.5 rounded">.env.local.example</code>, then
          restart <code className="text-zinc-300">npm run dev</code>.
        </p>

        <ul className="text-sm space-y-3 border border-zinc-800 rounded-lg p-4 bg-zinc-900/50">
          <li className="flex gap-2 items-start">
            <span className={publicOk ? "text-emerald-400" : "text-zinc-500"}>{publicOk ? "✓" : "○"}</span>
            <span>
              <code className="text-amber-300/90">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code className="text-amber-300/90">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> — same project as the Expo app.
            </span>
          </li>
          <li className="flex gap-2 items-start">
            <span className={adminOk ? "text-emerald-400" : "text-zinc-500"}>{adminOk ? "✓" : "○"}</span>
            <span>
              <code className="text-amber-300/90">SUPABASE_SERVICE_ROLE_KEY</code> — server only; never commit it.
            </span>
          </li>
          <li className="flex gap-2 items-start">
            <span className="text-zinc-500">○</span>
            <span>
              <code className="text-amber-300/90">COACH_ALLOWED_USER_IDS</code> — Jude&apos;s Supabase user UUID (comma
              separated if several).
            </span>
          </li>
        </ul>

        <p className="text-xs text-zinc-500">
          This page appears when public Supabase env vars are missing. After saving <code className="text-zinc-400">.env.local</code>, restart the dev server so Next.js picks up the values.
        </p>

        <Link
          href="/login"
          className="inline-block text-sm font-medium text-amber-400 hover:text-amber-300 underline underline-offset-2"
        >
          Try login again
        </Link>
      </div>
    </div>
  );
}
