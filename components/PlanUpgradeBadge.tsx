import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import type { Href } from 'expo-router';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { theme } from '@/constants/theme';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

/**
 * Upgrade pill beside the Train / Fuel screen title. Hidden only on Coaching.
 * Short label so it fits on small phones.
 */
export function PlanUpgradeBadge() {
  const tier = useSubscriptionStore((s) => s.tier);
  if (tier === 'coaching') return null;

  const isFree = tier === 'free';
  const label = isFree ? 'Upgrade' : 'Custom plans';
  const a11y = isFree
    ? 'Upgrade your plan. Opens subscription options.'
    : 'Upgrade to custom plans. Opens subscription options.';

  return (
    <Pressable
      onPress={() => router.push('/paywall' as Href)}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => [styles.press, pressed && styles.pressPressed]}>
      <LinearGradient
        colors={['rgba(255, 215, 0, 0.28)', 'rgba(255, 215, 0, 0.1)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}>
        <MaterialIcons
          name="workspace-premium"
          size={18}
          color={theme.colors.gold}
        />
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: {
    borderRadius: 999,
    overflow: 'hidden',
    flexShrink: 0,
  },
  pressPressed: {
    opacity: 0.85,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.55)',
    backgroundColor: theme.colors.surfaceContainerHigh,
  },
  label: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 0.5,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    maxWidth: 112,
  },
});
