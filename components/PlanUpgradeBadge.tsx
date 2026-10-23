import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { theme } from '@/constants/theme';
import { paywallHref } from '@/lib/analytics';
import { hasEssentialsAccess, useSubscriptionStore } from '@/stores/subscriptionStore';

/**
 * Upgrade pill beside the Train / Fuel screen title.
 * Hidden for Essentials and Coaching so subscribers are not sent back to the paywall.
 */
export function PlanUpgradeBadge() {
  const tier = useSubscriptionStore((s) => s.tier);
  if (hasEssentialsAccess(tier)) return null;

  return (
    <Pressable
      onPress={() => router.push(paywallHref('badge'))}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel="Upgrade your plan. Opens subscription options."
      style={({ pressed }) => [styles.press, pressed && styles.pressPressed]}>
      <LinearGradient
        colors={['rgba(235,213,174, 0.28)', 'rgba(235,213,174, 0.1)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}>
        <MaterialIcons
          name="workspace-premium"
          size={18}
          color={theme.colors.champagne}
        />
        <Text
          style={styles.label}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.78}>
          Upgrade
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: {
    borderRadius: 20,
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(235,213,174, 0.55)',
    backgroundColor: theme.colors.surfaceContainerHigh,
  },
  label: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 0.5,
    color: theme.colors.champagne,
    textTransform: 'uppercase',
    maxWidth: 168,
    textAlign: 'center',
  },
});
