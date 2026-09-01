import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { useOnboardingStore } from '@/stores/onboardingStore';
import { useCompletionStore } from '@/stores/completionStore';
import { useDailyContentStore } from '@/stores/dailyContentStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useFaithDailyStore } from '@/stores/faithDailyStore';
import { useWeightLogStore } from '@/stores/weightLogStore';

/** Legacy keys from when plans/workouts were cached on-device. */
const DROPPED_DEVICE_CACHE_KEYS = [
  'flight-plan',
  'flight-workout-library',
  'flight-workout-session-log',
  'flight-exercise-history',
  'flight-active-workout',
];

/** Wait for remaining persisted stores to rehydrate. Plans/workouts come from the cloud. */
export function useStoresHydrated(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      AsyncStorage.multiRemove(DROPPED_DEVICE_CACHE_KEYS),
      useOnboardingStore.persist.rehydrate(),
      useCompletionStore.persist.rehydrate(),
      useSubscriptionStore.persist.rehydrate(),
      useFaithDailyStore.persist.rehydrate(),
      useWeightLogStore.persist.rehydrate(),
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
