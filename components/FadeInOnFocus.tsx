import { useIsFocused } from '@react-navigation/native';
import { useLayoutEffect, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { SCREEN_FADE_MS } from '@/constants/screenFade';

/** Fades its children in each time the screen is focused. */
export function FadeInOnFocus({ children }: { children: ReactNode }) {
  const focused = useIsFocused();
  const opacity = useSharedValue(0);

  useLayoutEffect(() => {
    if (!focused) {
      opacity.value = 0;
      return;
    }
    opacity.value = 0;
    opacity.value = withTiming(1, {
      duration: SCREEN_FADE_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [focused, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.fill, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
