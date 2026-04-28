import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
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
import { useRegisteredAuth } from '@/lib/useRegisteredAuth';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const WELCOME_SLIDE_COUNT = 4;

const DUMMY_VERSE = {
  id: 'prov35',
  tags: ['strength'],
  bookId: 'PRO',
  bookName: 'Proverbs',
  chapter: 3,
  verse: 5,
  text: 'Trust in Yahweh with all your heart, and don’t lean on your own understanding.',
  reference: 'Proverbs 3:5',
} as any; // Typecast to bypass TS picking up internal types if necessary

const DUMMY_MACROS = {
  calories: 2200,
  proteinG: 185,
  carbsG: 200,
  fatG: 70,
};

const DUMMY_WORKOUT = {
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

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { ready: authReady, registered } = useRegisteredAuth();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const canGetStarted = carouselIndex >= WELCOME_SLIDE_COUNT - 1;

  const ctaOp = useSharedValue(0);
  const ctaScale = useSharedValue(0.94);
  const swipeNudge = useSharedValue(0);
  const swipePulse = useSharedValue(0.55);

  useEffect(() => {
    if (!authReady || !registered) return;
    router.replace('/' as Href);
  }, [authReady, registered]);

  useEffect(() => {
    ctaOp.value = withDelay(400, withTiming(1, { duration: 480 }));
    ctaScale.value = withDelay(400, withSpring(1, { damping: 14, stiffness: 120 }));
    swipeNudge.value = withRepeat(
      withSequence(
        withTiming(14, { duration: 650 }),
        withTiming(0, { duration: 650 })
      ),
      -1,
      false
    );
    swipePulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.55, { duration: 800 })
      ),
      -1,
      true
    );
  }, [ctaOp, ctaScale, swipeNudge, swipePulse]);

  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOp.value,
    transform: [{ scale: ctaScale.value }],
  }));

  const heroSwipeCueStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeNudge.value }],
    opacity: swipePulse.value,
  }));

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / SCREEN_WIDTH);
    setCarouselIndex(
      Math.min(WELCOME_SLIDE_COUNT - 1, Math.max(0, idx))
    );
  };

  const onGetStarted = () => {
    if (!canGetStarted) return;
    router.push('/email-sign-in' as Href);
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0a0a0a', '#000000', '#0d0d08']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['transparent', 'rgba(255,215,0,0.07)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + 28 }]}>
        <View style={styles.carouselContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={SCREEN_WIDTH}
            decelerationRate="fast"
            onMomentumScrollEnd={onMomentumScrollEnd}
            contentContainerStyle={styles.carouselContent}>
            <View style={styles.carouselItem}>
              <View style={styles.heroSlide}>
                <Text style={styles.heroTagline}>WHERE FAITH MEETS FUNCTION</Text>
                <Animated.View style={[styles.heroSwipeCue, heroSwipeCueStyle]}>
                  <Text style={styles.heroSwipeLabel}>SWIPE</Text>
                  <Text style={styles.heroSwipeChevron}>›</Text>
                </Animated.View>
              </View>
            </View>

            <View style={styles.carouselItem}>
              <View style={styles.cardWrapper}>
                <View style={styles.uiHeader}>
                  <View style={styles.uiHeaderRule} />
                  <Text style={styles.uiHeaderText}>
                    Daily verse with study context — right in your plan.
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
                  <Text style={styles.uiHeaderText}>
                    Macro targets and what you’ve logged today, at a glance.
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
                  <Text style={styles.uiHeaderText}>
                    Workouts with exercises, sets, reps, and rest — structured for you.
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

          </ScrollView>
        </View>

        <Animated.View style={[styles.ctaWrapper, ctaStyle]}>
          <Pressable
            style={({ pressed }) => [
              styles.primary,
              pressed && canGetStarted && styles.primaryPressed,
              !canGetStarted && styles.primaryLocked,
            ]}
            onPress={onGetStarted}
            disabled={!canGetStarted}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canGetStarted }}
            accessibilityLabel="Get started: verify email with a one-time code"
            accessibilityHint={
              canGetStarted
                ? undefined
                : 'Swipe through all welcome slides to the end to enable this button.'
            }>
            <Text
              style={[
                styles.primaryTxt,
                !canGetStarted && styles.primaryLockedTxt,
              ]}>
              Get started
            </Text>
          </Pressable>
          {!canGetStarted ? (
            <Text style={styles.ctaHint}>
              Swipe through each screen to unlock continue.
            </Text>
          ) : null}
        </Animated.View>
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
    paddingTop: 48,
    paddingBottom: 16,
  },
  heroTagline: {
    fontFamily: theme.fonts.headline,
    fontSize: 42,
    lineHeight: 48,
    color: theme.colors.onBackground,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  heroSwipeCue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 36,
  },
  heroSwipeLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 5,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  heroSwipeChevron: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    color: theme.colors.gold,
    opacity: 0.85,
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
    lineHeight: 26,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  ctaWrapper: {
    paddingHorizontal: 28,
    gap: 10,
  },
  ctaHint: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
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
  primaryLocked: {
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderColor: theme.colors.outline,
  },
  primaryTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.onGold,
    textTransform: 'uppercase',
  },
  primaryLockedTxt: {
    color: theme.colors.onSurfaceVariant,
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
});
