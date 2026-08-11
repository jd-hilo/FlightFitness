import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { theme } from '@/constants/theme';

const COLORS = [
  theme.colors.gold,
  '#FFFFFF',
  '#FFE070',
  '#C9A227',
  'rgba(255,255,255,0.7)',
];

const PIECE_COUNT = 20;

type PieceConfig = {
  drift: number;
  rise: number;
  fall: number;
  rotate: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  startLeft: number;
};

/** Deterministic-ish pseudo random so pieces feel varied but stable per index. */
function seededConfig(index: number): PieceConfig {
  const r = (n: number) => {
    const x = Math.sin((index + 1) * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  const dir = r(1) < 0.5 ? -1 : 1;
  return {
    drift: dir * (40 + r(2) * 150),
    rise: 70 + r(3) * 90,
    fall: 180 + r(4) * 160,
    rotate: (r(5) * 2 - 1) * 540,
    delay: r(6) * 90,
    duration: 850 + r(7) * 450,
    color: COLORS[index % COLORS.length]!,
    size: 6 + r(8) * 7,
    startLeft: 18 + r(9) * 64,
  };
}

function ConfettiPiece({ playKey, index }: { playKey: number; index: number }) {
  const cfg = useMemo(() => seededConfig(index), [index]);
  const ty = useSharedValue(0);
  const tx = useSharedValue(0);
  const rot = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (playKey === 0) return;
    ty.value = 0;
    tx.value = 0;
    rot.value = 0;
    opacity.value = 1;

    ty.value = withDelay(
      cfg.delay,
      withSequence(
        withTiming(-cfg.rise, { duration: 280, easing: Easing.out(Easing.quad) }),
        withTiming(cfg.fall, { duration: cfg.duration, easing: Easing.in(Easing.quad) })
      )
    );
    tx.value = withDelay(
      cfg.delay,
      withTiming(cfg.drift, {
        duration: cfg.duration + 280,
        easing: Easing.out(Easing.cubic),
      })
    );
    rot.value = withDelay(
      cfg.delay,
      withTiming(cfg.rotate, { duration: cfg.duration + 280 })
    );
    opacity.value = withDelay(
      cfg.delay + cfg.duration * 0.55,
      withTiming(0, { duration: cfg.duration * 0.45 })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playKey]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${rot.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left: `${cfg.startLeft}%`,
          width: cfg.size,
          height: cfg.size * 0.6,
          backgroundColor: cfg.color,
          borderRadius: index % 3 === 0 ? cfg.size : 1,
        },
        style,
      ]}
    />
  );
}

/**
 * Lightweight confetti pop. Increment `playKey` to fire (0 = idle).
 * Renders an absolutely-positioned, non-interactive overlay inside its parent.
 */
export function ConfettiBurst({ playKey }: { playKey: number }) {
  if (playKey === 0) return null;
  return (
    <View style={styles.overlay} pointerEvents="none">
      {Array.from({ length: PIECE_COUNT }, (_, i) => (
        <ConfettiPiece key={i} index={i} playKey={playKey} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  piece: {
    position: 'absolute',
    top: '50%',
  },
});
