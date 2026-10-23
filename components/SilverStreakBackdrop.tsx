import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

export const SILVER_BACKGROUND = '#C3CBD2';

/** Brushed silver gradient with slow-drifting light streaks, used on the welcome screen. */
export function SilverStreakBackdrop() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1.12)).current;

  useEffect(() => {
    const backdrop = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 9000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    backdrop.start();
    return () => backdrop.stop();
  }, [opacity, scale]);

  return (
    <>
      <LinearGradient
        colors={['#A9B3BD', '#C3CBD2', '#DDE1E5', '#EEF0F2']}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Animated.View
        style={[styles.streaks, { opacity, transform: [{ scale }, { rotate: '-14deg' }] }]}
        pointerEvents="none">
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
          style={[styles.streak, { top: '12%', height: 140 }]}
        />
        <LinearGradient
          colors={['rgba(120,132,144,0)', 'rgba(120,132,144,0.18)', 'rgba(120,132,144,0)']}
          style={[styles.streak, { top: '28%', height: 90 }]}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
          style={[styles.streak, { top: '58%', height: 180 }]}
        />
        <LinearGradient
          colors={['rgba(120,132,144,0)', 'rgba(120,132,144,0.12)', 'rgba(120,132,144,0)']}
          style={[styles.streak, { top: '76%', height: 110 }]}
        />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  streaks: {
    position: 'absolute',
    top: '-25%',
    bottom: '-25%',
    left: '-40%',
    right: '-40%',
  },
  streak: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
