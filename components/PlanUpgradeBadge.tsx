import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { theme } from '@/constants/theme';
import { paywallHref } from '@/lib/analytics';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

/**
 * Upgrade pill beside the Train / Fuel screen title. Hidden only on Coaching.
 */
export function PlanUpgradeBadge() {
  const tier = useSubscriptionStore((s) => s.tier);
  if (tier === 'coaching') return null;

  const isEssentials = tier === 'essentials';
  const label = isEssentials ? 'Unlock Custom Plans' : 'Upgrade';
  const a11y = isEssentials
    ? 'Unlock custom coaching plans. Opens subscription options.'
    : 'Upgrade your plan. Opens subscription options.';

  if (isEssentials) {
    return (
      <Pressable
        onPress={() => router.push(paywallHref('badge'))}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        style={({ pressed }) => [
          styles.press,
          styles.essentialsPress,
          pressed && styles.pressPressed,
        ]}>
        <MaterialIcons
          name="workspace-premium"
          size={18}
          color="rgba(255,255,255,0.58)"
        />
        <Text
          style={styles.essentialsLabel}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.78}>
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => router.push(paywallHref('badge'))}
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
        <Text
          style={styles.label}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.78}>
          {label}
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
    borderColor: 'rgba(255, 215, 0, 0.55)',
    backgroundColor: theme.colors.surfaceContainerHigh,
  },
  label: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 0.5,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    maxWidth: 168,
    textAlign: 'center',
  },
  essentialsPress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  essentialsLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.82)',
    textTransform: 'uppercase',
    maxWidth: 168,
    textAlign: 'center',
  },
});
