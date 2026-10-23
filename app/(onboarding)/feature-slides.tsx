import { router, useFocusEffect, type Href } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SILVER_BACKGROUND, SilverStreakBackdrop } from '@/components/SilverStreakBackdrop';
import { theme } from '@/constants/theme';
import { hapticImpact, ImpactStyle } from '@/lib/haptics';

const BUTTON_HEIGHT = 54;

function fadeUp(opacity: Animated.Value, translate: Animated.Value, duration: number) {
  return Animated.parallel([
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }),
    Animated.timing(translate, {
      toValue: 0,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }),
  ]);
}

/** Single transition page between faith goals and the Essentials offer. */
export default function TransformScreen() {
  const insets = useSafeAreaInsets();
  const [buttonLive, setButtonLive] = useState(false);

  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineY = useRef(new Animated.Value(14)).current;
  const verseOpacity = useRef(new Animated.Value(0)).current;
  const verseY = useRef(new Animated.Value(10)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonY = useRef(new Animated.Value(16)).current;

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark');
      return () => setStatusBarStyle('light');
    }, []),
  );

  useEffect(() => {
    const sequence = Animated.sequence([
      Animated.delay(350),
      fadeUp(headlineOpacity, headlineY, 1000),
      Animated.delay(450),
      fadeUp(verseOpacity, verseY, 1000),
      Animated.delay(400),
    ]);
    let button: Animated.CompositeAnimation | null = null;
    sequence.start(({ finished }) => {
      if (!finished) return;
      setButtonLive(true);
      button = fadeUp(buttonOpacity, buttonY, 900);
      button.start();
    });
    return () => {
      sequence.stop();
      button?.stop();
    };
  }, [buttonOpacity, buttonY, headlineOpacity, headlineY, verseOpacity, verseY]);

  return (
    <View style={styles.root}>
      <SilverStreakBackdrop />

      <View
        style={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.hero} pointerEvents="none">
          <Animated.Text
            style={[
              styles.headline,
              { opacity: headlineOpacity, transform: [{ translateY: headlineY }] },
            ]}>
            Are you ready to be transformed?
          </Animated.Text>

          <Animated.View
            style={[styles.verse, { opacity: verseOpacity, transform: [{ translateY: verseY }] }]}>
            <Text style={styles.verseText}>
              “Be transformed by the renewing of your mind.”
            </Text>
            <Text style={styles.verseRef}>Romans 12:2</Text>
          </Animated.View>
        </View>

        <Animated.View
          style={{ opacity: buttonOpacity, transform: [{ translateY: buttonY }] }}
          pointerEvents={buttonLive ? 'auto' : 'none'}>
          <Pressable
            onPress={() => {
              hapticImpact(ImpactStyle.Light);
              router.replace('/(onboarding)/upgrade-offer' as Href);
            }}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Continue">
            <Text style={styles.buttonTxt}>Continue</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SILVER_BACKGROUND,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.space.screen,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  headline: {
    maxWidth: 320,
    fontFamily: theme.fonts.headlineBold,
    fontSize: 32,
    lineHeight: 37,
    letterSpacing: -0.9,
    color: '#8E959C',
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.75)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 1,
  },
  verse: {
    marginTop: 28,
    alignItems: 'center',
    maxWidth: 280,
  },
  verseText: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(58,63,69,0.72)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  verseRef: {
    marginTop: 8,
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: 'rgba(58,63,69,0.5)',
  },
  button: {
    backgroundColor: '#000000',
    borderRadius: BUTTON_HEIGHT / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
    height: BUTTON_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1C2228',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
  pressed: { opacity: 0.85 },
  buttonTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 18,
    color: '#FFFFFF',
  },
});
