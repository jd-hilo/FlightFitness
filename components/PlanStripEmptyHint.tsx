import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

type Props = {
  variant: 'fuel' | 'train';
  onBuildManual?: () => void;
};

export function PlanStripEmptyHint({ variant, onBuildManual }: Props) {
  const tier = useSubscriptionStore((s) => s.tier);

  if (tier === 'coaching') {
    return (
      <View style={styles.wrap}>
        <Text style={styles.line}>
          {variant === 'fuel'
            ? 'Add meals yourself or wait for Jude to assign your plan.'
            : 'Build a workout or wait for Jude to assign your plan.'}
        </Text>
        {onBuildManual ? (
          <Pressable onPress={onBuildManual} style={styles.manualBtn}>
            <Text style={styles.link}>
              {variant === 'fuel' ? 'Add your first meal' : 'Build your first workout'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const noun = variant === 'fuel' ? 'meal' : 'workout';
  return (
    <View style={styles.wrap}>
      <Text style={styles.line}>
        Start manual — add your own {noun}s for this week, or use AI when you are ready.
      </Text>
      {onBuildManual ? (
        <Pressable onPress={onBuildManual} style={styles.manualBtn}>
          <Text style={styles.link}>
            {variant === 'fuel' ? 'Add meal' : 'Build workout'}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => router.push('/paywall')}
        accessibilityRole="button"
        accessibilityLabel="Upgrade for AI plans">
        <Text style={styles.subLink}>Generate with AI (Essentials)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  line: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  manualBtn: { marginTop: 10 },
  link: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 1.5,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  subLink: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 1.2,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 10,
  },
});
