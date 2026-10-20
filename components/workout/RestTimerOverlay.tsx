import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { ConfettiBurst } from '@/components/ConfettiBurst';
import { FrostedCard } from '@/components/FrostedCard';
import { OnboardingTooltip } from '@/components/onboarding/OnboardingTooltip';
import { sunriseImage } from '@/components/SunriseBackdrop';
import { theme } from '@/constants/theme';
import type { BiblePassage } from '@/lib/bibleApi';
import { formatDuration } from '@/lib/formatDuration';
import { hapticNotify } from '@/lib/haptics';
import { formatRestNextLabel, restVerseHeroText } from '@/lib/restVerseDisplay';
import { playRestTimerDing, prepareRestTimerDing } from '@/lib/restTimerDing';
import { getCachedVersePassage, loadVersePassage } from '@/lib/versePassageCache';
import { isVerseHighlighted, parseVerseReference } from '@/lib/versePassage';
import { displayAppName } from '@/lib/screenshotMode';
import type { VerseEntry } from '@/lib/verses';

type Props = {
  visible: boolean;
  seconds: number;
  /** Wall-clock end time so the countdown keeps running while the app is backgrounded. */
  endsAt?: number;
  verse: VerseEntry;
  verseSubtitle?: string;
  /** Where this verse sits in the workout rotation (0-based index). */
  versePosition?: { index: number; total: number };
  verseUpgradeLabel?: string;
  onVerseUpgradePress?: () => void;
  nextLabel: string;
  celebrateKey?: number;
  onSkip: () => void;
  onComplete: () => void;
  /** Onboarding-only coach mark; hides when the passage opens. */
  coachTip?: string;
  onOpenPassage?: () => void;
  /** When false, timer reaching 0 does not auto-dismiss (onboarding aha). */
  autoAdvance?: boolean;
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_STROKE = 7;
const URGENT_SECONDS = 10;

function verseTypeSize(length: number) {
  if (length <= 80) return { fontSize: 25, lineHeight: 34 };
  if (length <= 130) return { fontSize: 22, lineHeight: 31 };
  return { fontSize: 19, lineHeight: 27 };
}

function RestBackdrop() {
  const scale = useSharedValue(1.04);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.14, { duration: 18000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    return () => cancelAnimation(scale);
  }, [scale]);

  const drift = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.Image
        source={sunriseImage}
        resizeMode="cover"
        style={[StyleSheet.absoluteFill, drift]}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.78)', '#000000']}
        locations={[0, 0.3, 0.62, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(235,213,174,0.2)', 'rgba(235,213,174,0)']}
        start={{ x: 0.5, y: 0.15 }}
        end={{ x: 0.5, y: 0.55 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

type RingProps = {
  size: number;
  remaining: number;
  seconds: number;
  urgent: boolean;
};

/** Countdown ring that drains continuously between ticks, with a glowing tip. */
function RestRing({ size, remaining, seconds, urgent }: RingProps) {
  const r = (size - RING_STROKE * 2 - 10) / 2;
  const c = 2 * Math.PI * r;
  const center = size / 2;
  const progress = useSharedValue(1);
  const halo = useSharedValue(0);
  const pop = useSharedValue(1);
  const lastRemaining = useRef(remaining);

  useEffect(() => {
    const prev = lastRemaining.current;
    lastRemaining.current = remaining;
    const jumped = prev - remaining > 1;
    if (seconds <= 0 || remaining <= 0) {
      progress.value = withTiming(0, { duration: 200 });
      return;
    }
    if (remaining >= seconds || jumped) progress.value = remaining / seconds;
    progress.value = withTiming((remaining - 1) / seconds, {
      duration: 1000,
      easing: Easing.linear,
    });
  }, [remaining, seconds, progress]);

  useEffect(() => {
    halo.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    return () => cancelAnimation(halo);
  }, [halo]);

  useEffect(() => {
    if (!urgent) return;
    pop.value = withSequence(
      withTiming(1.07, { duration: 120 }),
      withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) })
    );
  }, [remaining, urgent, pop]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: c * (1 - progress.value),
  }));
  const tipProps = useAnimatedProps(() => {
    const a = -Math.PI / 2 + 2 * Math.PI * progress.value;
    return {
      cx: center + r * Math.cos(a),
      cy: center + r * Math.sin(a),
      opacity: progress.value > 0.002 ? 1 : 0,
    };
  });
  const tipGlowProps = useAnimatedProps(() => {
    const a = -Math.PI / 2 + 2 * Math.PI * progress.value;
    return {
      cx: center + r * Math.cos(a),
      cy: center + r * Math.sin(a),
      opacity: progress.value > 0.002 ? 0.28 : 0,
    };
  });
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + halo.value * 0.45,
    transform: [{ scale: 0.94 + halo.value * 0.08 }],
  }));
  const timeStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const accent = urgent ? '#FFFFFF' : theme.colors.champagne;

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            width: size * 0.78,
            height: size * 0.78,
            borderRadius: size,
            top: size * 0.11,
            left: size * 0.11,
            shadowColor: accent,
          },
          haloStyle,
        ]}
      />
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="restArc" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFF4DE" />
            <Stop offset="1" stopColor={theme.colors.champagne} />
          </SvgGradient>
        </Defs>
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke="rgba(255,255,255,0.09)"
          strokeWidth={RING_STROKE}
          fill="rgba(0,0,0,0.25)"
        />
        <Circle
          cx={center}
          cy={center}
          r={r - 16}
          stroke="rgba(235,213,174,0.08)"
          strokeWidth={1}
          fill="none"
        />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={r}
          stroke={urgent ? '#FFFFFF' : 'url(#restArc)'}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          animatedProps={arcProps}
          transform={`rotate(-90 ${center} ${center})`}
        />
        <AnimatedCircle r={RING_STROKE * 1.6} fill={accent} animatedProps={tipGlowProps} />
        <AnimatedCircle r={RING_STROKE * 0.7} fill="#FFFFFF" animatedProps={tipProps} />
      </Svg>
      <View style={styles.ringCenter} pointerEvents="none">
        <Text style={styles.ringKicker}>Rest</Text>
        <Animated.Text
          style={[
            styles.ringTime,
            { fontSize: size * 0.26, lineHeight: size * 0.3 },
            urgent && styles.ringTimeUrgent,
            timeStyle,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          accessibilityLabel={`${remaining} seconds remaining`}>
          {formatDuration(remaining)}
        </Animated.Text>
        <Text style={styles.ringTotal}>of {formatDuration(seconds)}</Text>
      </View>
    </View>
  );
}

function VerseDots({ index, total }: { index: number; total: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[styles.dot, i < index && styles.dotPast, i === index && styles.dotActive]}
        />
      ))}
    </View>
  );
}

function GlassCard({ children }: { children: ReactNode }) {
  return (
    <View style={styles.card}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.cardAndroidFill]} />
      )}
      <LinearGradient
        colors={['rgba(235,213,174,0.12)', 'rgba(255,255,255,0.02)', 'rgba(0,0,0,0.2)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

function RestTimerPill({ remaining }: { remaining: number }) {
  return (
    <View style={styles.restPill}>
      <Text style={styles.restPillLabel}>Rest</Text>
      <Text style={styles.restPillTime}>{formatDuration(remaining)}</Text>
    </View>
  );
}

export function RestTimerOverlay({
  visible,
  seconds,
  endsAt,
  verse,
  verseSubtitle = "Today's word",
  versePosition,
  verseUpgradeLabel,
  onVerseUpgradePress,
  nextLabel,
  celebrateKey = 0,
  onSkip,
  onComplete,
  coachTip,
  onOpenPassage,
  autoAdvance = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [remaining, setRemaining] = useState(seconds);
  const [readerOpen, setReaderOpen] = useState(false);
  const [passage, setPassage] = useState<BiblePassage | null>(null);
  const [passageLoading, setPassageLoading] = useState(false);
  const [passageError, setPassageError] = useState(false);
  const [isNewVerse, setIsNewVerse] = useState(false);
  const lastShownVerseRef = useRef<string | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const featuredRef = parseVerseReference(verse.reference);

  const verseHero = useMemo(() => restVerseHeroText(verse.text), [verse.text]);
  const nextLine = useMemo(() => formatRestNextLabel(nextLabel), [nextLabel]);
  const urgent = remaining > 0 && remaining <= URGENT_SECONDS;
  const done = remaining === 0 && !autoAdvance;
  const ringSize = Math.round(Math.min(width - 112, height * 0.32, 290));

  useEffect(() => {
    if (!visible) {
      setReaderOpen(false);
      setIsNewVerse(false);
      return;
    }
    prepareRestTimerDing();
    const last = lastShownVerseRef.current;
    setIsNewVerse(last != null && last !== verse.id);
    lastShownVerseRef.current = verse.id;
  }, [visible, verse.id]);

  useEffect(() => {
    if (!visible || seconds <= 0) return;
    const end = endsAt ?? Date.now() + seconds * 1000;
    let finished = false;
    const tick = () => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setRemaining(left);
      if (left > 0 || finished) return;
      finished = true;
      void playRestTimerDing();
      hapticNotify();
      if (autoAdvance) onCompleteRef.current();
    };
    tick();
    const id = setInterval(tick, 250);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [visible, seconds, endsAt, autoAdvance]);

  const loadPassage = useCallback(
    (force = false) => {
      const cached = !force ? getCachedVersePassage(verse) : null;
      if (cached) {
        setPassage(cached);
        setPassageError(false);
        setPassageLoading(false);
        return;
      }
      setPassageLoading(true);
      setPassageError(false);
      void loadVersePassage(verse, { force }).then((res) => {
        setPassageLoading(false);
        if (res) {
          setPassage(res);
          setPassageError(false);
        } else {
          setPassageError(true);
        }
      });
    },
    [verse]
  );

  useEffect(() => {
    loadPassage(false);
  }, [verse.id, verse.reference, loadPassage]);

  const openReader = () => {
    setReaderOpen(true);
    onOpenPassage?.();
    if (!passage && passageError) loadPassage(true);
  };

  const passageBody =
    passage?.verses && passage.verses.length > 0 ? (
      <View style={styles.readerVerses}>
        {passage.verses.map((v) => {
          const highlighted = isVerseHighlighted(v, featuredRef);
          return (
            <View
              key={`${v.bookId}-${v.chapter}-${v.verse}`}
              style={highlighted ? styles.readerVerseFeatured : styles.readerVerse}>
              <Text style={[styles.readerVerseNum, highlighted && styles.readerVerseNumFeatured]}>
                {v.verse}
              </Text>
              <Text style={[styles.readerVerseText, highlighted && styles.readerVerseTextFeatured]}>
                {v.text}
              </Text>
            </View>
          );
        })}
      </View>
    ) : (
      <Text style={[styles.readerVerseText, styles.readerFallbackBody]}>
        {passage?.text ?? verse.text}
      </Text>
    );

  const referenceDisplay = verse.reference.trim().toUpperCase();

  if (!visible) return null;

  const skipLabel = done ? 'Continue' : 'Skip rest';

  return (
    <Animated.View entering={FadeIn.duration(280)} style={styles.screen}>
      <RestBackdrop />
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + (readerOpen ? 8 : 14),
            paddingBottom: insets.bottom + 14,
          },
        ]}>
        {readerOpen ? (
          <Animated.View
            entering={FadeIn.duration(420)}
            exiting={FadeOut.duration(240)}
            style={styles.readerStage}>
            <View style={styles.readerTopBar}>
              <Pressable
                style={({ pressed }) => [styles.readerBackBtn, pressed && styles.pressed]}
                onPress={() => setReaderOpen(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Back to rest timer">
                <MaterialIcons name="arrow-back" size={22} color={theme.colors.onBackground} />
              </Pressable>
              <RestTimerPill remaining={remaining} />
            </View>

            <ScrollView
              style={styles.readerScroll}
              contentContainerStyle={styles.readerContent}
              showsVerticalScrollIndicator={false}>
              <FrostedCard style={styles.readerCard} intensity={24} glow>
                <Text style={styles.readerKicker}>Read in context</Text>
                <Text style={styles.readerTitle}>{verse.reference}</Text>
                {passage?.translationName ? (
                  <Text style={styles.readerMeta}>{passage.translationName}</Text>
                ) : null}

                {passageLoading ? (
                  <View style={styles.readerLoading}>
                    <ActivityIndicator color={theme.colors.champagne} />
                    <Text style={styles.readerLoadingTxt}>Loading passage…</Text>
                  </View>
                ) : (
                  <>
                    {passageBody}
                    {passageError ? (
                      <Pressable onPress={() => loadPassage(true)} hitSlop={8}>
                        <Text style={styles.readerFallbackNote}>
                          Couldn&apos;t load the full passage. Tap to retry.
                        </Text>
                      </Pressable>
                    ) : null}
                  </>
                )}
              </FrostedCard>
            </ScrollView>

            <Pressable
              onPress={onSkip}
              style={({ pressed }) => [
                styles.skipBtn,
                done && styles.skipBtnDone,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button">
              <Text style={[styles.skipTxt, done && styles.skipTxtDone]}>{skipLabel}</Text>
            </Pressable>
          </Animated.View>
        ) : (
          <>
            <Text style={styles.brandMark}>{displayAppName().toUpperCase()}</Text>

            <View style={styles.ringWrap}>
              <RestRing size={ringSize} remaining={remaining} seconds={seconds} urgent={urgent} />
            </View>

            <View style={styles.verseArea}>
              {coachTip ? (
                <View style={styles.coachTipWrap}>
                  <OnboardingTooltip text={coachTip} />
                </View>
              ) : null}
              <Animated.View
                key={verse.id}
                entering={FadeInDown.duration(520).delay(140)}
                style={styles.verseAnim}>
                <GlassCard>
                  <Pressable
                    style={({ pressed }) => [styles.cardInner, pressed && styles.pressed]}
                    onPress={openReader}
                    accessibilityRole="button"
                    accessibilityLabel={`${verse.reference}. ${verseHero.text}. Open full passage`}>
                    <View style={styles.cardHead}>
                      <Text style={styles.verseKicker} numberOfLines={1}>
                        {verseSubtitle}
                      </Text>
                      {isNewVerse ? (
                        <Animated.View
                          entering={ZoomIn.springify().delay(420)}
                          style={styles.newChip}>
                          <MaterialIcons
                            name="auto-awesome"
                            size={12}
                            color={theme.colors.onChampagne}
                          />
                          <Text style={styles.newChipTxt}>New verse</Text>
                        </Animated.View>
                      ) : null}
                    </View>

                    {versePosition && versePosition.total > 1 ? (
                      <View style={styles.positionRow}>
                        <VerseDots index={versePosition.index} total={versePosition.total} />
                        <Text style={styles.positionTxt}>
                          {versePosition.index + 1} of {versePosition.total}
                        </Text>
                      </View>
                    ) : null}

                    <Text style={styles.verseRef}>{referenceDisplay}</Text>
                    <Text
                      style={[styles.verseText, verseTypeSize(verseHero.text.length)]}
                      numberOfLines={7}>
                      “{verseHero.text}”
                    </Text>

                    <View style={styles.cardFoot}>
                      <Text style={styles.readHint}>
                        {verseHero.truncated ? 'Read full passage' : 'Read in context'}
                      </Text>
                      {passageLoading ? (
                        <ActivityIndicator size="small" color={theme.colors.champagne} />
                      ) : (
                        <MaterialIcons name="east" size={16} color={theme.colors.champagne} />
                      )}
                    </View>
                  </Pressable>
                </GlassCard>
              </Animated.View>

              {onVerseUpgradePress && verseUpgradeLabel ? (
                <Pressable
                  onPress={onVerseUpgradePress}
                  hitSlop={8}
                  style={({ pressed }) => [styles.upgradeRow, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={verseUpgradeLabel}>
                  <MaterialIcons name="lock-outline" size={14} color={theme.colors.champagne} />
                  <Text style={styles.upgradeTxt}>{verseUpgradeLabel}</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.footer}>
              {nextLine ? (
                <View style={styles.nextWrap}>
                  <Text style={styles.nextKicker}>Up next</Text>
                  <Text style={styles.nextTxt} numberOfLines={1}>
                    {nextLine}
                  </Text>
                </View>
              ) : null}
              <Pressable
                onPress={onSkip}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.skipBtn,
                  done && styles.skipBtnDone,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button">
                <Text style={[styles.skipTxt, done && styles.skipTxtDone]}>{skipLabel}</Text>
                {!done ? (
                  <MaterialIcons name="skip-next" size={18} color={theme.colors.onBackground} />
                ) : null}
              </Pressable>
            </View>
          </>
        )}
      </View>
      <ConfettiBurst playKey={celebrateKey} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
  },
  pressed: { opacity: 0.85 },
  brandMark: {
    alignSelf: 'center',
    fontFamily: theme.fonts.headlineBold,
    fontSize: 10,
    letterSpacing: 3.2,
    color: 'rgba(255,255,255,0.6)',
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 20,
  },
  halo: {
    position: 'absolute',
    backgroundColor: 'rgba(235,213,174,0.07)',
    shadowOpacity: 0.55,
    shadowRadius: 44,
    shadowOffset: { width: 0, height: 0 },
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  ringKicker: {
    ...theme.type.kicker,
    color: theme.colors.champagne,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  ringTime: {
    fontFamily: theme.fonts.headline,
    color: theme.colors.onBackground,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(235,213,174,0.45)',
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 0 },
  },
  ringTimeUrgent: {
    textShadowColor: 'rgba(255,255,255,0.6)',
  },
  ringTotal: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  verseArea: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 0,
  },
  coachTipWrap: { marginBottom: 8 },
  verseAnim: { flexShrink: 1 },
  card: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(235,213,174,0.22)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
    flexShrink: 1,
  },
  cardAndroidFill: { backgroundColor: 'rgba(22,20,18,0.86)' },
  cardInner: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 18,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 24,
  },
  verseKicker: {
    ...theme.type.kicker,
    flex: 1,
    color: theme.colors.champagne,
    textTransform: 'uppercase',
  },
  newChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.champagne,
  },
  newChipTxt: {
    fontFamily: theme.fonts.labelBold,
    fontSize: 11,
    color: theme.colors.onChampagne,
  },
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
  },
  dots: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  dotPast: { backgroundColor: 'rgba(235,213,174,0.45)' },
  dotActive: {
    width: 16,
    backgroundColor: theme.colors.champagne,
  },
  positionTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontVariant: ['tabular-nums'],
  },
  verseRef: {
    fontFamily: theme.fonts.labelBold,
    fontSize: 12,
    letterSpacing: 1.8,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 16,
    marginBottom: 10,
  },
  verseText: {
    fontFamily: theme.fonts.bodyMedium,
    color: theme.colors.onBackground,
    letterSpacing: -0.3,
  },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  readHint: {
    fontFamily: theme.fonts.label,
    fontSize: 13,
    color: theme.colors.champagne,
  },
  upgradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  upgradeTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 13,
    color: theme.colors.champagne,
  },
  footer: {
    paddingTop: 16,
    gap: 12,
  },
  nextWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 8,
  },
  nextKicker: {
    ...theme.type.kicker,
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
  },
  nextTxt: {
    flexShrink: 1,
    fontFamily: theme.fonts.label,
    fontSize: 15,
    color: theme.colors.onBackground,
  },
  skipBtn: {
    height: 52,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  skipBtnDone: {
    backgroundColor: theme.colors.champagne,
    borderColor: theme.colors.champagne,
  },
  skipTxt: {
    ...theme.type.buttonBold,
    color: theme.colors.onBackground,
  },
  skipTxtDone: { color: theme.colors.onChampagne },
  restPill: {
    borderWidth: 1,
    borderColor: 'rgba(235,213,174,0.4)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 72,
    borderRadius: theme.radii.full,
  },
  restPillLabel: {
    ...theme.type.kicker,
    fontSize: 10,
    color: theme.colors.champagne,
    textTransform: 'uppercase',
  },
  restPillTime: {
    fontFamily: theme.fonts.headline,
    fontSize: 20,
    color: theme.colors.onBackground,
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  readerStage: { flex: 1 },
  readerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  readerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.glass,
    borderWidth: 1,
    borderColor: theme.colors.glassEdge,
  },
  readerScroll: { flex: 1 },
  readerContent: { paddingBottom: 20 },
  readerCard: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.16)',
  },
  readerKicker: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.72)',
    textTransform: 'uppercase',
  },
  readerTitle: {
    ...theme.type.cardTitle,
    color: theme.colors.onBackground,
    marginTop: 8,
  },
  readerMeta: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginTop: 6,
  },
  readerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 28,
  },
  readerLoadingTxt: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  readerVerses: {
    marginTop: 18,
    gap: 12,
    paddingBottom: 12,
  },
  readerVerse: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  readerVerseFeatured: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: -8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(235,213,174,0.14)',
  },
  readerVerseNum: {
    width: 22,
    fontFamily: theme.fonts.label,
    fontSize: 12,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.45)',
  },
  readerVerseNumFeatured: {
    color: theme.colors.champagne,
  },
  readerVerseText: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    lineHeight: 26,
    color: theme.colors.onBackground,
  },
  readerVerseTextFeatured: {
    fontFamily: theme.fonts.bodyMedium,
  },
  readerFallbackBody: {
    flex: 0,
    marginTop: 18,
    marginBottom: 16,
  },
  readerFallbackNote: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.onSurfaceVariant,
    marginTop: 8,
    marginBottom: 16,
  },
});
