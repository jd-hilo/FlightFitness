import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

type Size = 'large' | 'medium' | 'small';

const DIMS: Record<Size, { boxW: number; boxH: number; stemW: number; armW: number; armH: number; armTop: number }> = {
  large: { boxW: 40, boxH: 52, stemW: 4, armW: 30, armH: 4, armTop: 12 },
  medium: { boxW: 32, boxH: 42, stemW: 3, armW: 24, armH: 3, armTop: 9 },
  small: { boxW: 22, boxH: 28, stemW: 2, armW: 16, armH: 2, armTop: 6 },
};

type Props = {
  size?: Size;
  /** Default white; override only if needed on light surfaces. */
  color?: string;
};

/**
 * Pulsing Latin cross used instead of the system spinner for app loading states.
 */
export function AppLoadingCross({ size = 'large', color = '#FFFFFF' }: Props) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [t]);

  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.08] });
  const opacity = t.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  const d = DIMS[size];
  const stemLeft = (d.boxW - d.stemW) / 2;
  const armLeft = (d.boxW - d.armW) / 2;

  return (
    <View style={[styles.outer, { width: d.boxW, height: d.boxH }]}>
      <Animated.View
        style={[
          styles.cross,
          {
            width: d.boxW,
            height: d.boxH,
            opacity,
            transform: [{ scale }],
          },
        ]}>
        <View
          style={[
            styles.stem,
            {
              width: d.stemW,
              height: d.boxH,
              left: stemLeft,
              top: 0,
              backgroundColor: color,
              borderRadius: d.stemW / 2,
            },
          ]}
        />
        <View
          style={[
            styles.arm,
            {
              width: d.armW,
              height: d.armH,
              top: d.armTop,
              left: armLeft,
              backgroundColor: color,
              borderRadius: d.armH / 2,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cross: {
    position: 'relative',
  },
  stem: {
    position: 'absolute',
  },
  arm: {
    position: 'absolute',
  },
});
