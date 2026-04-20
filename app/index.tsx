import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useStoresHydrated } from '@/lib/hydration';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useHasActivePlan } from '@/stores/planStore';
import { theme } from '@/constants/theme';
import { useDailyContentStore } from '@/stores/dailyContentStore';

export default function Index() {
  const hydrated = useStoresHydrated();
  const completed = useOnboardingStore((s) => s.completedAt != null);
  const hasPlan = useHasActivePlan();
  const dailyFetchSettled = useDailyContentStore((s) => s.dailyFetchSettled);

  /** Don’t send users to Home until today’s hero (fetch + prefetch) has finished — avoids empty hero then pop-in. */
  useEffect(() => {
    if (!hydrated || !completed || !hasPlan) return;
    void useDailyContentStore.getState().load();
  }, [hydrated, completed, hasPlan]);

  if (!hydrated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.gold} />
      </View>
    );
  }

  if (!completed) {
    return <Redirect href="/(onboarding)" />;
  }

  if (!hasPlan) {
    return <Redirect href="/(onboarding)/generate" />;
  }

  if (!dailyFetchSettled) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.gold} />
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
