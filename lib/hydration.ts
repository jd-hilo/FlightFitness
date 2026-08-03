import { useEffect, useState } from 'react';

import { useOnboardingStore } from '@/stores/onboardingStore';
import { usePlanStore } from '@/stores/planStore';
import { useCompletionStore } from '@/stores/completionStore';
import { useDailyContentStore } from '@/stores/dailyContentStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useFaithDailyStore } from '@/stores/faithDailyStore';
import { useWeightLogStore } from '@/stores/weightLogStore';
import { useWorkoutLibraryStore } from '@/stores/workoutLibraryStore';
import { useWorkoutSessionLogStore } from '@/stores/workoutSessionLogStore';

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
      useWeightLogStore.persist.rehydrate(),
      useWorkoutLibraryStore.persist.rehydrate(),
      useWorkoutSessionLogStore.persist.rehydrate(),
      useDailyContentStore.persist.rehydrate(),
    ]).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}
