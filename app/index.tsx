import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppLoadingCross } from '@/components/AppLoadingCross';
import { pullProfileOnboardingIntoStore } from '@/lib/api/profileOnboarding';
import { useStoresHydrated } from '@/lib/hydration';
import { useRegisteredAuth } from '@/lib/useRegisteredAuth';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useHasActivePlan } from '@/stores/planStore';
import { theme } from '@/constants/theme';
import { useDailyContentStore } from '@/stores/dailyContentStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

export default function Index() {
  const hydrated = useStoresHydrated();
  const { ready: authReady, registered: authRegistered } = useRegisteredAuth();
  const completed = useOnboardingStore((s) => s.completedAt != null);
  const hasPlan = useHasActivePlan();
  const tier = useSubscriptionStore((s) => s.tier);
  const freeAiRemaining = useSubscriptionStore((s) => s.freeAiWeekGenerationsRemaining);
  const dailyFetchSettled = useDailyContentStore((s) => s.dailyFetchSettled);
  const [remoteOnboardingChecked, setRemoteOnboardingChecked] = useState(false);

  /** Prefetch daily hero for Home/Faith even when Fuel/Train have no plan yet. */
  useEffect(() => {
    if (!hydrated || !completed) return;
    void useDailyContentStore.getState().load();
  }, [hydrated, completed]);

  /**
   * On a fresh install or after local sign-out, completed onboarding may only exist
   * in Supabase. Restore it before routing, otherwise returning users hit onboarding.
   */
  useEffect(() => {
    if (!hydrated || !authReady || !authRegistered) {
      setRemoteOnboardingChecked(false);
      return;
    }
    if (completed) {
      setRemoteOnboardingChecked(true);
      return;
    }

    let cancelled = false;
    setRemoteOnboardingChecked(false);
    void pullProfileOnboardingIntoStore().finally(() => {
      if (!cancelled) setRemoteOnboardingChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, authReady, authRegistered, completed]);

  if (!hydrated || !authReady) {
    return (
      <View style={styles.center}>
        <AppLoadingCross size="large" />
      </View>
    );
  }

  if (!authRegistered) {
    return <Redirect href="/welcome" />;
  }

  if (!completed && !remoteOnboardingChecked) {
    return (
      <View style={styles.center}>
        <AppLoadingCross size="large" />
      </View>
    );
  }

  if (!completed) {
    return <Redirect href="/(onboarding)" />;
  }

  if (!hasPlan) {
    if (tier === 'coaching') {
      return <Redirect href="/(tabs)" />;
    }
    if (tier === 'free' && freeAiRemaining <= 0) {
      if (!dailyFetchSettled) {
        return (
          <View style={styles.center}>
            <AppLoadingCross size="large" />
          </View>
        );
      }
      return <Redirect href="/(tabs)" />;
    }
    return <Redirect href="/(onboarding)/generate" />;
  }

  if (!dailyFetchSettled) {
    return (
      <View style={styles.center}>
        <AppLoadingCross size="large" />
      </View>
    );
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
