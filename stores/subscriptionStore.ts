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

export function useCanGeneratePlan() {
  const tier = useSubscriptionStore((s) => s.tier);
  const freeUsed = useSubscriptionStore((s) => s.freePlanUsed);
  if (tier === 'essentials' || tier === 'coaching') return true;
  return !freeUsed;
}

export function useCanCustomize() {
  const tier = useSubscriptionStore((s) => s.tier);
  return tier === 'essentials' || tier === 'coaching';
}
