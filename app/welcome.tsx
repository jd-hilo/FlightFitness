import { Redirect, router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { useRegisteredAuth } from '@/lib/useRegisteredAuth';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { ready, registered } = useRegisteredAuth();

  if (ready && registered) {
    return <Redirect href={'/' as Href} />;
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.center}>
        <Text style={styles.brand}>FLIGHT FITNESS</Text>
        <Text style={styles.tagline}>Where faith meets function</Text>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.primary,
          (!ready || pressed) && styles.primaryPressed,
        ]}
        disabled={!ready}
        onPress={() => router.push('/(intake)/fitness-goal' as Href)}
        accessibilityRole="button"
        accessibilityLabel="Continue">
        <Text style={styles.primaryTxt}>Continue</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 28,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  brand: {
    fontFamily: theme.fonts.headline,
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -1.5,
    color: theme.colors.onBackground,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  tagline: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    lineHeight: 22,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  primary: {
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radii.full,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryPressed: {
    opacity: 0.88,
  },
  primaryTxt: {
    fontFamily: theme.fonts.labelBold,
    fontSize: 17,
    color: theme.colors.onGold,
  },
});
