import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

type Props = {
  /** Shapes the one-line copy (meals vs training). */
  variant: 'fuel' | 'train';
};

/**
 * Shown under the week strip when there is no synced plan and we are not
 * actively generating — subtle nudge instead of a mock week.
 */
export function PlanStripEmptyHint({ variant }: Props) {
  const tier = useSubscriptionStore((s) => s.tier);

  if (tier === 'coaching') {
    return (
      <View style={styles.wrap}>
        <Text style={styles.line}>
          {variant === 'fuel'
            ? 'Meals from Jude will show here when your plan is ready.'
            : 'Workouts from Jude will show here when your plan is ready.'}
        </Text>
      </View>
    );
  }

  if (tier === 'essentials') {
    return (
      <View style={styles.wrap}>
        <Text style={styles.line}>
          {"We couldn't load this week's plan yet. Check your connection or try again later."}
        </Text>
      </View>
    );
  }

  const noun = variant === 'fuel' ? 'meals' : 'training';
  return (
    <Pressable
      onPress={() => router.push('/paywall')}
      style={styles.wrap}
      accessibilityRole="button"
      accessibilityLabel={`Upgrade for AI ${noun} plans`}>
      <Text style={styles.line}>
        Upgrade to Essentials for AI {noun} and grocery lists for this week.
      </Text>
      <Text style={styles.link}>View plans</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginBottom: 8,
  },
  line: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  link: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 1.5,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 6,
  },
});
