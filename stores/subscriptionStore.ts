import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isAiWeekPlanEnabled } from '@/lib/featureFlags';

export type SubscriptionTier = 'free' | 'essentials' | 'coaching';

export const FREE_TIER_MAX_SAVED_WORKOUTS = 3;
export const FREE_TIER_MAX_SAVED_MEALS = 5;

export function hasPremiumLibraryAccess(tier: SubscriptionTier): boolean {
  return tier === 'essentials' || tier === 'coaching';
}

export function savedWorkoutLimit(tier: SubscriptionTier): number | null {
  return hasPremiumLibraryAccess(tier) ? null : FREE_TIER_MAX_SAVED_WORKOUTS;
}

export function savedMealLimit(tier: SubscriptionTier): number | null {
  return hasPremiumLibraryAccess(tier) ? null : FREE_TIER_MAX_SAVED_MEALS;
}

export function canAddSavedWorkout(tier: SubscriptionTier, currentCount: number): boolean {
  const limit = savedWorkoutLimit(tier);
  return limit == null || currentCount < limit;
}

export function canAddSavedMealTemplate(
  tier: SubscriptionTier,
  templates: { name: string }[],
  mealName: string
): boolean {
  if (hasPremiumLibraryAccess(tier)) return true;
  const key = mealName.trim().toLowerCase();
  const isUpdate = templates.some((t) => t.name.trim().toLowerCase() === key);
  if (isUpdate) return true;
  return templates.length < FREE_TIER_MAX_SAVED_MEALS;
}

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
      /**
       * Rehydration can finish after RevenueCat has already applied a higher tier from
       * the network, restoring a stale `tier` from disk (e.g. still `free`). Refresh from
       * RevenueCat once storage has merged so UI matches StoreKit / sandbox entitlements.
       */
      onRehydrateStorage: () => () => {
        void import('@/lib/revenueCat').then(({ refreshRevenueCatCustomerInfo }) => {
          void refreshRevenueCatCustomerInfo();
        });
      },
    }
  )
);

/** True when automatic full-week AI generation is allowed for this subscription. */
export function shouldAllowAiFullWeekGeneration(): boolean {
  if (!isAiWeekPlanEnabled()) return false;
  const s = useSubscriptionStore.getState();
  if (s.tier === 'essentials') return true;
  if (s.tier === 'coaching') return false;
  return s.freeAiWeekGenerationsRemaining > 0;
}

/** Per-exercise / per-day AI assists (swap, regenerate day, etc.). */
export function useCanCustomize() {
  return isAiWeekPlanEnabled();
}
