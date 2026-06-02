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
            ? 'Add meals yourself for this week.'
            : 'Build a workout for this week.'}
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
        Add your own {noun}s for this week to get started.
      </Text>
      {onBuildManual ? (
        <Pressable onPress={onBuildManual} style={styles.manualBtn}>
          <Text style={styles.link}>
            {variant === 'fuel' ? 'Add meal' : 'Build workout'}
          </Text>
        </Pressable>
      ) : null}
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
});
