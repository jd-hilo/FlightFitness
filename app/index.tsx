import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppLoadingCross } from '@/components/AppLoadingCross';
import { pullProfileOnboardingIntoStore } from '@/lib/api/profileOnboarding';
import { useStoresHydrated } from '@/lib/hydration';
import { useRegisteredAuth } from '@/lib/useRegisteredAuth';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useDailyContentStore } from '@/stores/dailyContentStore';
import { theme } from '@/constants/theme';

export default function Index() {
  const hydrated = useStoresHydrated();
  const { ready: authReady, registered: authRegistered } = useRegisteredAuth();
  const completed = useOnboardingStore((s) => s.completedAt != null);
  const [remoteOnboardingChecked, setRemoteOnboardingChecked] = useState(false);

  /**
   * Warm daily verse + hero in the background. Do not block routing on this —
   * the edge function can take many seconds when it must generate today's image.
   */
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
    void (async () => {
      try {
        await pullProfileOnboardingIntoStore();
      } catch (error) {
        if (__DEV__) console.warn('[index] onboarding restore failed:', error);
      } finally {
        if (!cancelled) setRemoteOnboardingChecked(true);
      }
    })();
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
