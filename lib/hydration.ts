import { useEffect, useState } from 'react';

import { useOnboardingStore } from '@/stores/onboardingStore';
import { usePlanStore } from '@/stores/planStore';
import { useCompletionStore } from '@/stores/completionStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useFaithDailyStore } from '@/stores/faithDailyStore';

/** Wait for all persisted stores to rehydrate from AsyncStorage. */
export function useStoresHydrated(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      useOnboardingStore.persist.rehydrate(),
      usePlanStore.persist.rehydrate(),
      useCompletionStore.persist.rehydrate(),
      useSubscriptionStore.persist.rehydrate(),
      useFaithDailyStore.persist.rehydrate(),
    ]).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}
