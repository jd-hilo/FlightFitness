import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { isSupabasePublicConfigured } from "@/lib/supabase/config";

export async function createClient() {
  if (!isSupabasePublicConfigured()) {
    return null;
  }

  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          /* set from Server Component — middleware refreshes session */
        }
      },
    },
  });
}
