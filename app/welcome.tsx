import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import { bootstrapAnonymousSession, supabaseConfigured } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const [getStartedBusy, setGetStartedBusy] = useState(false);

  const ctaOp = useSharedValue(0);
  const ctaScale = useSharedValue(0.94);
  const swipeNudge = useSharedValue(0);
  const swipePulse = useSharedValue(0.55);

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

  const onGetStarted = async () => {
    if (getStartedBusy) return;
    setGetStartedBusy(true);
    try {
      if (supabaseConfigured) {
        const session = await bootstrapAnonymousSession();
        if (__DEV__) {
          if (session?.access_token) {
            console.log('[Get started] Anonymous session ready for Edge Functions');
          } else {
            console.warn(
              '[Get started] Still no JWT after retries — enable Anonymous under Authentication → Providers in Supabase. Onboarding will try again when the plan generates.'
            );
          }
        }
      }
    } catch (e) {
      if (__DEV__) console.warn('[Get started] bootstrapAnonymousSession:', e);
    }
    router.replace('/(onboarding)' as Href);
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
              pressed && styles.primaryPressed,
              getStartedBusy && styles.primaryDisabled,
            ]}
            onPress={onGetStarted}
            disabled={getStartedBusy}
            accessibilityRole="button"
            accessibilityLabel="Get started and continue to onboarding">
            {getStartedBusy ? (
              <ActivityIndicator color={theme.colors.onGold} />
            ) : (
              <Text style={styles.primaryTxt}>Get started</Text>
            )}
          </Pressable>
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
    maxWidth: 400,
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 16,
  },
  heroTagline: {
    fontFamily: theme.fonts.headline,
    fontSize: 36,
    lineHeight: 42,
    color: theme.colors.onBackground,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  heroSwipeCue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 36,
  },
  heroSwipeLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    letterSpacing: 6,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  heroSwipeChevron: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 22,
    color: theme.colors.gold,
    opacity: 0.85,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 400,
  },
  uiHeader: {
    width: '100%',
    marginBottom: 14,
    gap: 10,
  },
  uiHeaderRule: {
    width: 36,
    height: 3,
    backgroundColor: theme.colors.gold,
  },
  uiHeaderText: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.onSurfaceVariant,
  },
  ctaWrapper: {
    paddingHorizontal: 28,
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
  primaryDisabled: {
    opacity: 0.85,
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
    padding: 32,
    overflow: 'hidden',
  },
  wordBgRef: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontFamily: theme.fonts.headlineBold,
    fontSize: 48,
    color: theme.colors.onBackground,
    opacity: 0.08,
    textTransform: 'uppercase',
  },
  wordQuote: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 26,
    lineHeight: 32,
    color: theme.colors.onBackground,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  wordRef: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 3,
    color: '#737373',
    textTransform: 'uppercase',
  },
  wordBtns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 32,
  },
  btnGold: {
    backgroundColor: theme.colors.gold,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  btnGoldTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1,
    color: theme.colors.onGold,
    textTransform: 'uppercase',
  },
});
