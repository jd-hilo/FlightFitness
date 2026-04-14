import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type SubscriptionTier = 'free' | 'essentials' | 'coaching';

type SubscriptionState = {
  tier: SubscriptionTier;
  freePlanUsed: boolean;
  setTier: (tier: SubscriptionTier) => void;
  markFreePlanUsed: () => void;
  resetDev: () => void;
};

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set) => ({
      tier: 'free',
      freePlanUsed: false,
      setTier: (tier) => set({ tier }),
      markFreePlanUsed: () => set({ freePlanUsed: true }),
      resetDev: () => set({ tier: 'free', freePlanUsed: false }),
    }),
    {
      name: 'flight-subscription',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/** AI plan generation is always allowed (subscription gating disabled for now). */
export function useCanGeneratePlan() {
  return true;
}

/** AI customization (swap meal, etc.) is always allowed. */
export function useCanCustomize() {
  return true;
}
