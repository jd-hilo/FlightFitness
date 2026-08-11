import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MacroDashboard } from '@/components/plan/MacroDashboard';
import { WorkoutBlock } from '@/components/plan/WorkoutBlock';
import { theme } from '@/constants/theme';
import {
  FLIGHT_FITNESS_PRIVACY_POLICY_URL,
  FLIGHT_FITNESS_TERMS_OF_SERVICE_URL,
} from '@/lib/legalUrls';
import { restVerseHeroText } from '@/lib/restVerseDisplay';
import { useRegisteredAuth } from '@/lib/useRegisteredAuth';
import type { MacroTargets, WorkoutDay } from '@/types/plan';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const WELCOME_SLIDE_COUNT = 5;

const DUMMY_VERSE = {
  text: 'Trust in Yahweh with all your heart, and don’t lean on your own understanding.',
  reference: 'Proverbs 3:5',
};

const DUMMY_MACROS: MacroTargets = {
  calories: 2200,
  proteinG: 185,
  carbsG: 200,
  fatG: 70,
};

const DUMMY_WORKOUT: WorkoutDay = {
  dayIndex: 0,
  title: 'Push — Strength',
  exercises: [
    {
      id: 'ex1',
      name: 'Incline Bench Press',
      sets: 4,
      reps: '8-10',
      restSec: 120,
    },
  ],
};

function ProgressBars({ scrollProgress }: { scrollProgress: SharedValue<number> }) {
  return (
    <View
      style={styles.progressRow}
      accessibilityRole="progressbar"
      accessibilityLabel="Welcome intro progress">
      {Array.from({ length: WELCOME_SLIDE_COUNT }, (_, i) => (
        <ProgressSegment key={i} i={i} scrollProgress={scrollProgress} />
      ))}
    </View>
  );
}

function ProgressSegment({
  i,
  scrollProgress,
}: {
  i: number;
  scrollProgress: SharedValue<number>;
}) {
  const fillStyle = useAnimatedStyle(() => {
    // Past slides stay full; the active slide fills as you swipe into it.
    const fill = interpolate(scrollProgress.value, [i - 1, i], [0, 1], 'clamp');
    return {
      transform: [{ scaleX: fill }],
    };
  });

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, fillStyle]} />
    </View>
  );
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { ready: authReady, registered } = useRegisteredAuth();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const isLastSlide = carouselIndex >= WELCOME_SLIDE_COUNT - 1;
  const restVerse = restVerseHeroText(DUMMY_VERSE.text);

  const scrollProgress = useSharedValue(0);
  const ctaOp = useSharedValue(0);
  const ctaScale = useSharedValue(0.94);
  const swipeNudge = useSharedValue(0);
  const swipePulse = useSharedValue(0.55);

  useEffect(() => {
    if (!authReady || !registered) return;
    router.replace('/' as Href);
  }, [authReady, registered]);

  useEffect(() => {
    swipeNudge.value = withRepeat(
      withSequence(
        withTiming(10, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    swipePulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 850 }),
        withTiming(0.5, { duration: 850 })
      ),
      -1,
      true
    );
  }, [swipeNudge, swipePulse]);

  useEffect(() => {
    if (!isLastSlide) {
      ctaOp.value = 0;
      ctaScale.value = 0.94;
      return;
    }
    ctaOp.value = withDelay(120, withTiming(1, { duration: 420 }));
    ctaScale.value = withDelay(120, withSpring(1, { damping: 14, stiffness: 120 }));
  }, [isLastSlide, ctaOp, ctaScale]);

  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOp.value,
    transform: [{ scale: ctaScale.value }],
  }));

  const swipeCueStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeNudge.value }],
    opacity: swipePulse.value,
  }));

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    scrollProgress.value = x / SCREEN_WIDTH;
  };

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / SCREEN_WIDTH);
    setCarouselIndex(Math.min(WELCOME_SLIDE_COUNT - 1, Math.max(0, idx)));
  };

  const onGetStarted = () => {
    if (!isLastSlide) return;
    router.push('/email-sign-in' as Href);
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0a0a0a', '#000000', '#0d0d08']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.screen, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20 }]}>
        <ProgressBars scrollProgress={scrollProgress} />

        <View style={styles.carouselContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={SCREEN_WIDTH}
            decelerationRate="fast"
            onScroll={onScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={onMomentumScrollEnd}
            contentContainerStyle={styles.carouselContent}>
            <View style={styles.carouselItem}>
              <View style={styles.heroSlide}>
                <Text style={styles.brandMark}>FLIGHT FITNESS</Text>
                <Text style={styles.heroTagline}>WHERE FAITH MEETS FUNCTION</Text>
              </View>
            </View>

            <View style={styles.carouselItem}>
              <View style={styles.cardWrapper}>
                <View style={styles.uiHeader}>
                  <View style={styles.uiHeaderRule} />
                  <Text style={styles.uiHeaderText} numberOfLines={1}>
                    Daily verse & study
                  </Text>
                </View>
                <View style={styles.wordCard}>
                  <Text style={styles.wordBgRef}>PROVERBS 3</Text>
                  <Text style={styles.wordQuote}>&ldquo;{DUMMY_VERSE.text}&rdquo;</Text>
                  <Text style={styles.wordRef}>
                    {DUMMY_VERSE.reference.toUpperCase()} // WISDOM SERIES
                  </Text>
                  <View style={styles.wordBtns}>
                    <View style={styles.btnGold}>
                      <Text style={styles.btnGoldTxt}>Study Context</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.carouselItem}>
              <View style={styles.cardWrapper}>
                <View style={styles.uiHeader}>
                  <View style={styles.uiHeaderRule} />
                  <Text style={styles.uiHeaderText} numberOfLines={1}>
                    Track your macros
                  </Text>
                </View>
                <MacroDashboard
                  compact
                  targets={DUMMY_MACROS}
                  loggedKcal={1500}
                  loggedProtein={140}
                  loggedCarbs={110}
                  loggedFat={42}
                />
              </View>
            </View>

            <View style={styles.carouselItem}>
              <View style={styles.cardWrapper}>
                <View style={styles.uiHeader}>
                  <View style={styles.uiHeaderRule} />
                  <Text style={styles.uiHeaderText} numberOfLines={1}>
                    Structured workouts
                  </Text>
                </View>
                <WorkoutBlock
                  compact
                  workout={DUMMY_WORKOUT}
                  completed={false}
                  exerciseIdsDone={['ex1']}
                  onToggleComplete={() => {}}
                  onToggleExercise={() => {}}
                />
              </View>
            </View>

            <View style={styles.carouselItem}>
              <View style={styles.cardWrapper}>
                <View style={styles.uiHeader}>
                  <View style={styles.uiHeaderRule} />
                  <Text style={styles.uiHeaderText} numberOfLines={1}>
                    Study between sets
                  </Text>
                </View>
                <View style={styles.restCard}>
                  <Text style={styles.restKicker}>Rest</Text>
                  <Text style={styles.restTimer}>1:30</Text>
                  <View style={styles.restProgressTrack}>
                    <View style={styles.restProgressFill} />
                  </View>
                  <Text style={styles.restNext}>Next · Incline bench · Set 3</Text>
                  <View style={styles.restVerseBlock}>
                    <Text style={styles.restVerseLabel}>Today&apos;s word</Text>
                    <Text style={styles.restVerseRef}>
                      {DUMMY_VERSE.reference.toUpperCase()}
                    </Text>
                    <Text style={styles.restVerseText}>{restVerse.text}</Text>
                    <Text style={styles.restVerseTap}>Tap to read in context ›</Text>
                  </View>
                  <Text style={styles.restBrand}>FLIGHT FITNESS</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>

        <View style={styles.footer}>
          {isLastSlide ? (
            <Animated.View style={[styles.ctaWrapper, ctaStyle]}>
              <Pressable
                style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
                onPress={onGetStarted}
                accessibilityRole="button"
                accessibilityLabel="Get started: verify email with a one-time code">
                <Text style={styles.primaryTxt}>Get started</Text>
              </Pressable>
              <Text style={styles.terms}>
                By using Flight Fitness, you agree to our{' '}
                <Text
                  style={styles.termsLink}
                  accessibilityRole="link"
                  accessibilityLabel="Terms of Service"
                  onPress={() =>
                    void WebBrowser.openBrowserAsync(FLIGHT_FITNESS_TERMS_OF_SERVICE_URL)
                  }>
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text
                  style={styles.termsLink}
                  accessibilityRole="link"
                  accessibilityLabel="Privacy Policy"
                  onPress={() =>
                    void WebBrowser.openBrowserAsync(FLIGHT_FITNESS_PRIVACY_POLICY_URL)
                  }>
                  Privacy Policy
                </Text>
                .
              </Text>
            </Animated.View>
          ) : (
            <Animated.View
              style={[styles.swipeCue, swipeCueStyle]}
              accessibilityLiveRegion="polite">
              <Text style={styles.swipeCueTxt}>Swipe to get started</Text>
              <Text style={styles.swipeCueChevron}>›</Text>
            </Animated.View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  screen: {
    flex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  progressTrack: {
    flex: 1,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    transformOrigin: 'left center',
  },
  carouselContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  carouselContent: {
    alignItems: 'center',
  },
  carouselItem: {
    width: SCREEN_WIDTH,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  heroSlide: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: 16,
    gap: 18,
  },
  brandMark: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 4,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  heroTagline: {
    fontFamily: theme.fonts.headline,
    fontSize: 42,
    lineHeight: 48,
    color: theme.colors.onBackground,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 360,
    flexDirection: 'column',
    gap: 16,
  },
  uiHeader: {
    width: '100%',
    marginBottom: 0,
    gap: 10,
  },
  uiHeaderRule: {
    width: 44,
    height: 4,
    backgroundColor: theme.colors.gold,
  },
  uiHeaderText: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 20,
    lineHeight: 24,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  footer: {
    minHeight: 92,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  swipeCue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  swipeCueTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 2.4,
    color: 'rgba(255,255,255,0.78)',
    textTransform: 'uppercase',
  },
  swipeCueChevron: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    color: 'rgba(255,255,255,0.78)',
    marginTop: -1,
  },
  ctaWrapper: {
    gap: 10,
  },
  terms: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  termsLink: {
    color: theme.colors.gold,
    textDecorationLine: 'underline',
  },
  primary: {
    backgroundColor: theme.colors.gold,
    paddingVertical: 17,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.4)',
  },
  primaryPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  primaryTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.onGold,
    textTransform: 'uppercase',
  },
  wordCard: {
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 12,
    overflow: 'hidden',
  },
  wordBgRef: {
    position: 'absolute',
    top: 4,
    right: 4,
    fontFamily: theme.fonts.headlineBold,
    fontSize: 26,
    color: theme.colors.onBackground,
    opacity: 0.08,
    textTransform: 'uppercase',
  },
  wordQuote: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 14,
    lineHeight: 18,
    color: theme.colors.onBackground,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  wordRef: {
    fontFamily: theme.fonts.label,
    fontSize: 8,
    letterSpacing: 1.5,
    color: '#737373',
    textTransform: 'uppercase',
  },
  wordBtns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  btnGold: {
    backgroundColor: theme.colors.gold,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  btnGoldTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 8,
    letterSpacing: 0.5,
    color: theme.colors.onGold,
    textTransform: 'uppercase',
  },
  restCard: {
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 14,
    gap: 6,
  },
  restKicker: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 3,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  restTimer: {
    fontFamily: theme.fonts.headline,
    fontSize: 48,
    lineHeight: 50,
    color: theme.colors.gold,
    fontVariant: ['tabular-nums'],
  },
  restProgressTrack: {
    height: 2,
    backgroundColor: 'rgba(255, 215, 0, 0.18)',
    marginVertical: 4,
    overflow: 'hidden',
  },
  restProgressFill: {
    width: '58%',
    height: '100%',
    backgroundColor: theme.colors.gold,
  },
  restNext: {
    fontFamily: theme.fonts.label,
    fontSize: 8,
    letterSpacing: 1.2,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  restVerseBlock: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
    gap: 4,
  },
  restVerseLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 8,
    letterSpacing: 2,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  restVerseRef: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 1.5,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  restVerseText: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 15,
    lineHeight: 20,
    color: theme.colors.onBackground,
    fontStyle: 'italic',
  },
  restVerseTap: {
    fontFamily: theme.fonts.label,
    fontSize: 8,
    letterSpacing: 1,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  restBrand: {
    fontFamily: theme.fonts.label,
    fontSize: 8,
    letterSpacing: 3,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginTop: 12,
    textAlign: 'center',
  },
});
