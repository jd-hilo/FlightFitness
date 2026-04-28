import { useCoachChatStore } from '@/stores/coachChatStore';
import { useCompletionStore } from '@/stores/completionStore';
import { useDailyContentStore } from '@/stores/dailyContentStore';
import { useFaithDailyStore } from '@/stores/faithDailyStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { usePlanStore } from '@/stores/planStore';
import { usePlanWeekEnsureStore } from '@/stores/planWeekEnsureStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useUiStore } from '@/stores/uiStore';
import { useVerseModalStore } from '@/stores/verseModalStore';

/**
 * Clears local app data so after sign-out (and a relaunch) the user starts from
 * welcome + onboarding, not the previous profile or plan.
 */
export function resetLocalAppStateForSignOut(): void {
  useVerseModalStore.getState().hide();
  useCoachChatStore.setState({ unreadCount: 0 });
  usePlanWeekEnsureStore.getState().setInProgress(false);
  useUiStore.getState().setSelectedPlanDay(0);

  useOnboardingStore.getState().reset();
  usePlanStore.getState().clearPlan();
  useSubscriptionStore.getState().resetDev();
  useCompletionStore.getState().reset();
  useFaithDailyStore.getState().reset();

  useDailyContentStore.setState({
    content: null,
    loading: false,
    dailyFetchSettled: false,
  });
}
