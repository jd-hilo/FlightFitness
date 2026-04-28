import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type SubscriptionTier = 'free' | 'essentials' | 'coaching';

type SubscriptionState = {
  tier: SubscriptionTier;
  freePlanUsed: boolean;
  /**
   * Free tier only: remaining AI `full` week generations allowed via ensure / onboarding.
   * Essentials ignores this (unlimited). Coaching never uses AI full-week gen.
   */
  freeAiWeekGenerationsRemaining: number;
  setTier: (tier: SubscriptionTier) => void;
  markFreePlanUsed: () => void;
  /** Onboarding “Get 1 week free” — allows exactly one full AI week while still on Free. */
  grantOnboardingFreeAiWeek: () => void;
  /** After a successful full-week AI save while on Free, consume one credit. */
  consumeFreeAiWeekAfterFullGenerateIfNeeded: () => void;
  resetDev: () => void;
};

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set) => ({
      tier: 'free',
      freePlanUsed: false,
      freeAiWeekGenerationsRemaining: 0,
      setTier: (tier) => set({ tier }),
      markFreePlanUsed: () => set({ freePlanUsed: true }),
      grantOnboardingFreeAiWeek: () =>
        set((s) =>
          s.tier === 'free' ? { freeAiWeekGenerationsRemaining: 1 } : s
        ),
      consumeFreeAiWeekAfterFullGenerateIfNeeded: () =>
        set((s) => {
          if (s.tier !== 'free') return s;
          return {
            freeAiWeekGenerationsRemaining: Math.max(
              0,
              s.freeAiWeekGenerationsRemaining - 1
            ),
          };
        }),
      resetDev: () =>
        set({
          tier: 'free',
          freePlanUsed: false,
          freeAiWeekGenerationsRemaining: 0,
        }),
    }),
    {
      name: 'flight-subscription',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/** True when automatic full-week AI generation is allowed for this subscription. */
export function shouldAllowAiFullWeekGeneration(): boolean {
  const s = useSubscriptionStore.getState();
  if (s.tier === 'essentials') return true;
  if (s.tier === 'coaching') return false;
  return s.freeAiWeekGenerationsRemaining > 0;
}

/** AI customization (swap meal, etc.) is always allowed. */
export function useCanCustomize() {
  return true;
}
