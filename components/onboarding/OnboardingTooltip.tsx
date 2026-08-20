import { type ReactNode, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { theme } from '@/constants/theme';

type Props = {
  text: string;
  children?: ReactNode;
  /** Bubble sits above (default) or below the target. */
  placement?: 'above' | 'below';
  kicker?: string;
};

/** Coach mark used only during onboarding — not in the live app. */
export function OnboardingTooltip({
  text,
  children,
  placement = 'above',
  kicker = 'Tip',
}: Props) {
  const op = useSharedValue(0);
  const y = useSharedValue(placement === 'below' ? -6 : 6);

  useEffect(() => {
    op.value = 0;
    y.value = placement === 'below' ? -6 : 6;
    op.value = withDelay(400, withTiming(1, { duration: 220 }));
    y.value = withDelay(400, withTiming(0, { duration: 220 }));
  }, [op, placement, text, y]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: y.value }],
  }));

  const bubble = (
    <Animated.View
      style={[
        styles.cluster,
        placement === 'below' ? styles.clusterBelow : styles.clusterAbove,
        children ? styles.clusterOnTarget : styles.clusterStandalone,
        animStyle,
      ]}
      accessibilityRole="text">
      {placement === 'below' ? <View style={[styles.nub, styles.nubUp]} /> : null}
      <View style={styles.bubble}>
        <Text style={styles.kicker}>{kicker}</Text>
        <Text style={styles.text}>{text}</Text>
      </View>
      {placement === 'above' ? <View style={styles.nub} /> : null}
    </Animated.View>
  );

  if (!children) return bubble;

  return (
    <View style={styles.anchor}>
      {placement === 'above' ? bubble : null}
      {children}
      {placement === 'below' ? bubble : null}
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    gap: 0,
  },
  cluster: {
    alignItems: 'flex-start',
    overflow: 'visible',
  },
  clusterAbove: {
    marginBottom: 2,
  },
  clusterBelow: {
    marginTop: 2,
  },
  clusterOnTarget: {},
  clusterStandalone: {
    marginBottom: 12,
    marginTop: 0,
  },
  bubble: {
    borderWidth: 1,
    borderColor: theme.colors.gold,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '100%',
  },
  kicker: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  text: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.onBackground,
  },
  nub: {
    width: 8,
    height: 8,
    marginLeft: 16,
    marginTop: -5,
    zIndex: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.gold,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    transform: [{ rotate: '45deg' }],
  },
  nubUp: {
    marginTop: 0,
    marginBottom: -5,
  },
});
