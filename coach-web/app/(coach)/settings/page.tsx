export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
      <p className="text-zinc-400 text-sm mb-6">
        Environment variables control access. Service role and coach allowlist are never exposed to the browser.
      </p>
      <ul className="text-sm text-zinc-300 space-y-2 list-disc list-inside max-w-xl">
        <li>
          <code className="text-amber-400/90">NEXT_PUBLIC_SUPABASE_URL</code> — same project as the mobile app.
        </li>
        <li>
          <code className="text-amber-400/90">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> — for Jude&apos;s email OTP sign-in
          (session cookies). In Supabase, enable Email auth and add <code className="text-zinc-400">{"{{ .Token }}"}</code>{" "}
          to the Magic Link template so messages include a 6-digit code.
        </li>
        <li>
          <code className="text-amber-400/90">SUPABASE_SERVICE_ROLE_KEY</code> — server only; used to read/write all client
          data and send coach messages.
        </li>
        <li>
          <code className="text-amber-400/90">COACH_ALLOWED_USER_IDS</code> — comma-separated Supabase user UUIDs allowed to
          open this dashboard (Jude&apos;s account).
        </li>
      </ul>
    </div>
  );
}
