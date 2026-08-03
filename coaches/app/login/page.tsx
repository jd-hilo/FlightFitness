import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "@/components/LoginForm";
import { isSupabasePublicConfigured } from "@/lib/supabase/config";

export default function LoginPage() {
  if (!isSupabasePublicConfigured()) {
    redirect("/setup");
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400 text-sm">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
