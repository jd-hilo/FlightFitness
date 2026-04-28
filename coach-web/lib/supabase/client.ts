import { createBrowserClient } from "@supabase/ssr";

import { isSupabasePublicConfigured } from "@/lib/supabase/config";

export function createClient() {
  if (!isSupabasePublicConfigured()) {
    return null;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();
  return createBrowserClient(url, anon);
}
