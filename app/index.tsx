import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useStoresHydrated } from '@/lib/hydration';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useHasActivePlan } from '@/stores/planStore';
import { theme } from '@/constants/theme';

export default function Index() {
  const hydrated = useStoresHydrated();
  const completed = useOnboardingStore((s) => s.completedAt != null);
  const hasPlan = useHasActivePlan();

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
