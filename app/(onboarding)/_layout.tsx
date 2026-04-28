import { Redirect, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppLoadingCross } from '@/components/AppLoadingCross';
import { theme } from '@/constants/theme';
import { useRegisteredAuth } from '@/lib/useRegisteredAuth';

export default function OnboardingLayout() {
  const { ready, registered } = useRegisteredAuth();

  if (!ready) {
    return (
      <View style={styles.center}>
        <AppLoadingCross size="large" />
      </View>
    );
  }

  if (!registered) {
    return <Redirect href="/welcome" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000' },
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
