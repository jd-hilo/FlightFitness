import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { theme } from '@/constants/theme';

const BAR_WIDTH_FRAC = 0.42;

type Props = {
  visible: boolean;
};

function GeneratingProgressBar({ active }: { active: boolean }) {
  const progress = useRef(new Animated.Value(0)).current;
  const [trackW, setTrackW] = useState(0);

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      progress.setValue(0);
    };
  }, [active, progress]);

  const barW = Math.max(0, trackW * BAR_WIDTH_FRAC);
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-barW, trackW],
  });

  return (
    <View
      style={styles.progressTrack}
      onLayout={(e: LayoutChangeEvent) =>
        setTrackW(e.nativeEvent.layout.width)
      }>
      {trackW > 0 ? (
        <Animated.View
          style={[
            styles.progressFill,
            { width: barW, transform: [{ translateX }] },
          ]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      ) : null}
    </View>
  );
}

export function PlanGeneratingModal({ visible }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}>
      <View style={styles.backdrop} accessibilityViewIsModal>
        <View style={styles.card}>
          <Text style={styles.kicker}>Flight Fitness</Text>
          <Text style={styles.title}>Building your week</Text>
          <Text style={styles.sub}>
            We are creating your personalized meals, workouts, and grocery list from your
            answers. Most finish within a minute.
          </Text>
          <View
            style={styles.progressWrap}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Building your week"
            accessibilityValue={{ text: 'In progress' }}>
            <GeneratingProgressBar active={visible} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.35)',
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingVertical: 36,
    paddingHorizontal: 28,
  },
  kicker: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 3,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  title: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 26,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginBottom: 12,
    lineHeight: 30,
  },
  sub: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: 28,
  },
  progressWrap: {
    width: '100%',
  },
  progressTrack: {
    height: 5,
    width: '100%',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.gold,
    borderRadius: 2,
  },
});
