import { usePostHog } from 'posthog-react-native';
import { useEffect } from 'react';

import { isRegisteredAppUser } from '@/lib/useRegisteredAuth';
import { supabase, supabaseConfigured } from '@/lib/supabase';

let lastIdentifiedUserId: string | null = null;

export function usePostHogUserSync() {
  const posthog = usePostHog();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!supabaseConfigured || !supabase) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!cancelled && user?.id && isRegisteredAppUser(user)) {
        if (lastIdentifiedUserId !== user.id) {
          posthog.identify(
            user.id,
            user.email ? { email: user.email } : undefined
          );
          lastIdentifiedUserId = user.id;
        }
      }
    })();

    if (!supabaseConfigured || !supabase) {
      return () => {
        cancelled = true;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;

      const user = session?.user;
      if (user?.id && isRegisteredAppUser(user)) {
        if (lastIdentifiedUserId !== user.id) {
          posthog.identify(
            user.id,
            user.email ? { email: user.email } : undefined
          );
          lastIdentifiedUserId = user.id;
        }
      } else if (event === 'SIGNED_OUT') {
        posthog.reset();
        lastIdentifiedUserId = null;
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [posthog]);
}
