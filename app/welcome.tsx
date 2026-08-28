import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfettiBurst } from '@/components/ConfettiBurst';
import { MacroDashboard } from '@/components/plan/MacroDashboard';
import { theme } from '@/constants/theme';
import { hapticImpact } from '@/lib/haptics';
import {
  FLIGHT_FITNESS_PRIVACY_POLICY_URL,
  FLIGHT_FITNESS_TERMS_OF_SERVICE_URL,
} from '@/lib/legalUrls';
import { restVerseHeroText } from '@/lib/restVerseDisplay';
import { useRegisteredAuth } from '@/lib/useRegisteredAuth';
import type { MacroTargets } from '@/types/plan';

const BEATS = ['brand', 'set', 'rest', 'fuel', 'faith'] as const;
type Beat = (typeof BEATS)[number];

const REST_SEC = 20;

const DUMMY_VERSE = {
  text: 'Trust in Yahweh with all your heart, and don’t lean on your own understanding.',
  reference: 'Proverbs 3:5',
};

const DUMMY_CONTEXT =
  'In all your ways acknowledge him, and he will make your paths straight.';

const DUMMY_MACROS: MacroTargets = {
  calories: 2200,
  proteinG: 185,
  carbsG: 200,
  fatG: 70,
};

function FadeStage({
  active,
  children,
  enterDelay = 0,
}: {
  active: boolean;
  children: ReactNode;
  enterDelay?: number;
}) {
  const op = useSharedValue(0);
  const y = useSharedValue(18);

  useEffect(() => {
    if (active) {
      op.value = withDelay(
        enterDelay,
        withTiming(1, { duration: 780, easing: Easing.out(Easing.cubic) })
      );
      y.value = withDelay(
        enterDelay,
        withTiming(0, { duration: 780, easing: Easing.out(Easing.cubic) })
      );
    } else {
      op.value = withTiming(0, { duration: 420, easing: Easing.in(Easing.cubic) });
      y.value = withTiming(-10, { duration: 420, easing: Easing.in(Easing.cubic) });
    }
  }, [active, enterDelay, op, y]);

  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.View
      style={[styles.stage, style]}
      pointerEvents={active ? 'auto' : 'none'}>
      {children}
    </Animated.View>
  );
}

function ActionKicker({ label }: { label: string }) {
  return (
    <View style={styles.kickerRow}>
      <View style={styles.kickerRule} />
      <Text style={styles.kicker}>{label}</Text>
    </View>
  );
}

function formatRestClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { ready: authReady, registered } = useRegisteredAuth();
  const [beat, setBeat] = useState<Beat>('brand');
  const [setDone, setSetDone] = useState(false);
  const [celebrateKey, setCelebrateKey] = useState(0);
  const [restRemaining, setRestRemaining] = useState(REST_SEC);
  const [verseTapped, setVerseTapped] = useState(false);
  const beatIndex = BEATS.indexOf(beat);
  const isLast = beat === 'faith';
  const restVerse = restVerseHeroText(DUMMY_VERSE.text);

  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!authReady || !registered) return;
    router.replace('/' as Href);
  }, [authReady, registered]);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.08, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
      false
    );
  }, [pulse]);

  useEffect(() => {
    if (beat !== 'rest') return;
    setRestRemaining(REST_SEC);
    const tick = setInterval(() => {
      setRestRemaining((r) => (r <= 1 ? 0 : r - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, [beat]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const goNext = () => {
    const next = BEATS[beatIndex + 1];
    if (next) setBeat(next);
  };

  const skipToEnd = () => setBeat('faith');

  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderRelease: (_e, g) => {
          if (g.dx > 60 && beatIndex > 0) {
            setBeat(BEATS[beatIndex - 1]);
          } else if (g.dx < -60) {
            const next = BEATS[beatIndex + 1];
            if (next) setBeat(next);
          }
        },
      }),
    [beatIndex]
  );

  const onCompleteSet = () => {
    if (setDone) return;
    setSetDone(true);
    hapticImpact();
    setCelebrateKey((k) => k + 1);
  };

  const onTapVerse = () => {
    if (verseTapped) return;
    setVerseTapped(true);
    hapticImpact();
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0a0a0a', '#000000', '#0d0d08']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View
        {...swipe.panHandlers}
        style={[
          styles.screen,
          { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 16 },
        ]}>
        <View style={styles.topBar}>
          <View
            style={styles.progressRow}
            accessibilityRole="progressbar"
            accessibilityLabel={`Welcome, step ${beatIndex + 1} of ${BEATS.length}`}>
            {BEATS.map((id, i) => (
              <View key={id} style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      opacity: i <= beatIndex ? 1 : 0.22,
                      transform: [{ scaleX: i <= beatIndex ? 1 : 0 }],
                    },
                  ]}
                />
              </View>
            ))}
          </View>
          {!isLast ? (
            <Pressable
              onPress={skipToEnd}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Skip intro">
              <Text style={styles.skip}>Skip</Text>
            </Pressable>
          ) : (
            <View style={styles.skipSpacer} />
          )}
        </View>

        <View style={styles.stageHost}>
          <FadeStage active={beat === 'brand'}>
            <View style={styles.brandSlide}>
              <Text style={styles.brandMark}>FLIGHT FITNESS</Text>
              <Text style={styles.heroTagline}>WHERE FAITH{'\n'}MEETS FUNCTION</Text>
            </View>
          </FadeStage>

          <FadeStage active={beat === 'set'}>
            <ActionKicker label="Your first set starts now" />
            <Text style={styles.actionLead}>
              Tap the circle to complete the set.
            </Text>
            <Pressable
              onPress={onCompleteSet}
              style={[styles.setCard, setDone && styles.setCardDone]}
              accessibilityRole="button"
              accessibilityLabel="Mark set 1 complete">
              <View style={styles.setHead}>
                <Animated.View style={!setDone ? pulseStyle : undefined}>
                  <MaterialIcons
                    name={setDone ? 'check-circle' : 'radio-button-unchecked'}
                    size={30}
                    color={theme.colors.gold}
                  />
                </Animated.View>
                <View style={styles.setBadge}>
                  <Text style={styles.setBadgeTxt}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.setName}>Plank</Text>
                  <Text style={styles.setMeta}>Set 1 · 20 sec</Text>
                </View>
              </View>
              <Text style={styles.setTapHint}>
                {setDone ? 'Done' : 'Tap when done'}
              </Text>
            </Pressable>
          </FadeStage>

          <FadeStage active={beat === 'rest'}>
            <ActionKicker label="Rest — stay in the Word" />
            <Text style={styles.actionLead}>A verse with every rest.</Text>
            <View style={styles.restCard}>
              <View style={styles.restHead}>
                <Text style={styles.restKicker}>Rest</Text>
                <Text style={styles.restTimer}>{formatRestClock(restRemaining)}</Text>
              </View>
              <View style={styles.restProgressTrack}>
                <View
                  style={[
                    styles.restProgressFill,
                    { width: `${Math.max(4, (restRemaining / REST_SEC) * 100)}%` },
                  ]}
                />
              </View>
              <Pressable
                onPress={onTapVerse}
                style={styles.restVerseBlock}
                accessibilityRole="button"
                accessibilityLabel="Read today's verse in context">
                <Text style={styles.restVerseLabel}>Today&apos;s word</Text>
                <Text style={styles.restVerseRef}>
                  {DUMMY_VERSE.reference.toUpperCase()}
                </Text>
                <Text style={styles.restVerseText}>{restVerse.text}</Text>
                {verseTapped ? (
                  <Text style={styles.restVerseContext}>{DUMMY_CONTEXT}</Text>
                ) : (
                  <Text style={styles.restVerseTap}>Tap to read in context ›</Text>
                )}
              </Pressable>
            </View>
          </FadeStage>

          <FadeStage active={beat === 'fuel'}>
            <ActionKicker label="Track your macros" />
            <Text style={styles.actionLead}>Log meals. Hit your numbers.</Text>
            <MacroDashboard
              compact
              targets={DUMMY_MACROS}
              loggedKcal={1500}
              loggedProtein={140}
              loggedCarbs={110}
              loggedFat={42}
            />
          </FadeStage>

          <FadeStage active={beat === 'faith'} enterDelay={80}>
            <ActionKicker label="Strengthen your faith" />
            <Text style={styles.actionLead}>A verse and reading, every day.</Text>
            <View style={styles.wordCard}>
              <Text style={styles.wordBgRef}>PROVERBS 3</Text>
              <Text style={styles.wordQuote}>&ldquo;{DUMMY_VERSE.text}&rdquo;</Text>
              <Text style={styles.wordRef}>
                {DUMMY_VERSE.reference.toUpperCase()} // WISDOM SERIES
              </Text>
            </View>
          </FadeStage>
        </View>

        <View style={styles.footer}>
          <View style={styles.ctaWrapper}>
            <Pressable
              style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
              onPress={isLast ? () => router.push('/email-sign-in' as Href) : goNext}
              accessibilityRole="button"
              accessibilityLabel={
                isLast ? 'Get started: verify email with a one-time code' : 'Next'
              }>
              <Text style={styles.primaryTxt}>{isLast ? 'Get started' : 'Next'}</Text>
            </Pressable>
            {isLast ? (
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
            ) : null}
          </View>
        </View>
        <ConfettiBurst playKey={celebrateKey} />
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  progressRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
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
    backgroundColor: theme.colors.gold,
    borderRadius: 2,
    transformOrigin: 'left center',
  },
  skip: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  skipSpacer: { width: 36 },
  stageHost: {
    flex: 1,
    justifyContent: 'center',
  },
  stage: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  brandSlide: {
    alignItems: 'center',
    gap: 18,
    paddingBottom: 24,
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
  kickerRow: {
    gap: 10,
    marginBottom: 12,
  },
  kickerRule: {
    width: 44,
    height: 4,
    backgroundColor: theme.colors.gold,
  },
  kicker: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 20,
    lineHeight: 24,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  actionLead: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 18,
  },
  setCard: {
    borderWidth: 1,
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.surfaceContainerHigh,
    padding: 16,
    gap: 12,
  },
  setCardDone: {
    opacity: 0.85,
  },
  setHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  setBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setBadgeTxt: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 12,
    color: theme.colors.onGold,
  },
  setName: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 16,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  setMeta: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 1.2,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  setTapHint: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 1.6,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,215,0,0.25)',
    paddingTop: 12,
  },
  restCard: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    padding: 16,
    gap: 8,
  },
  restHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
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
    fontSize: 44,
    lineHeight: 48,
    color: theme.colors.gold,
    fontVariant: ['tabular-nums'],
  },
  restProgressTrack: {
    height: 2,
    backgroundColor: 'rgba(255, 215, 0, 0.18)',
    overflow: 'hidden',
  },
  restProgressFill: {
    height: '100%',
    backgroundColor: theme.colors.gold,
  },
  restVerseBlock: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
    gap: 6,
  },
  restVerseLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 2,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  restVerseRef: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 1.6,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  restVerseText: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    lineHeight: 24,
    color: theme.colors.onBackground,
  },
  restVerseContext: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.onSurfaceVariant,
  },
  restVerseTap: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 1.2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  wordCard: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    padding: 18,
    overflow: 'hidden',
  },
  wordBgRef: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontFamily: theme.fonts.headlineBold,
    fontSize: 28,
    color: theme.colors.onBackground,
    opacity: 0.08,
    textTransform: 'uppercase',
  },
  wordQuote: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    lineHeight: 26,
    color: theme.colors.onBackground,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  wordRef: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#737373',
    textTransform: 'uppercase',
  },
  footer: {
    minHeight: 88,
    justifyContent: 'flex-end',
    paddingHorizontal: 28,
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
});
