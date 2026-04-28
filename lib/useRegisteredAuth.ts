import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { supabase, supabaseConfigured } from '@/lib/supabase';

/**
 * True when the user intentionally signed in (email OTP, OAuth, etc.).
 * Anonymous Supabase sessions (used only for JWT on some Edge paths) do not count.
 */
export function isRegisteredAppUser(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.is_anonymous === true) return false;
  if (user.email) return true;
  const ids = user.identities ?? [];
  return ids.some((i) => i.provider !== 'anonymous');
}

/**
 * Resolves once Supabase has emitted the initial session from storage (or confirmed none).
 * `registered` is only meaningful when `ready` is true and `supabaseConfigured` is true.
 */
export function useRegisteredAuth(): {
  ready: boolean;
  registered: boolean;
} {
  const [ready, setReady] = useState(!supabaseConfigured);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      setReady(true);
      setRegistered(false);
      return;
    }

    let cancelled = false;

    const apply = (user: User | null | undefined) => {
      if (!cancelled) {
        setRegistered(isRegisteredAppUser(user));
        setReady(true);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session?.user ?? null);
    });

    void supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        apply(session?.user ?? null);
      })
      .catch(() => apply(null));

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { ready, registered };
}
