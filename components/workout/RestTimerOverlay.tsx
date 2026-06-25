import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfettiBurst } from '@/components/ConfettiBurst';
import { theme } from '@/constants/theme';
import type { BiblePassage } from '@/lib/bibleApi';
import { formatDuration } from '@/lib/formatDuration';
import { formatRestNextLabel, restVerseHeroText } from '@/lib/restVerseDisplay';
import { playRestTimerDing, prepareRestTimerDing } from '@/lib/restTimerDing';
import { hapticNotify } from '@/lib/haptics';
import {
  getCachedVersePassage,
  loadVersePassage,
} from '@/lib/versePassageCache';
import {
  isVerseHighlighted,
  parseVerseReference,
} from '@/lib/versePassage';
import type { VerseEntry } from '@/lib/verses';

type Props = {
  visible: boolean;
  seconds: number;
  verse: VerseEntry;
  verseSubtitle?: string;
  verseUpgradeLabel?: string;
  onVerseUpgradePress?: () => void;
  nextLabel: string;
  celebrateKey?: number;
  onSkip: () => void;
  onComplete: () => void;
};

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
  verse,
  verseSubtitle = "Today's word",
  verseUpgradeLabel,
  onVerseUpgradePress,
  nextLabel,
  celebrateKey = 0,
  onSkip,
  onComplete,
}: Props) {
  const insets = useSafeAreaInsets();
  const [remaining, setRemaining] = useState(seconds);
  const [readerOpen, setReaderOpen] = useState(false);
  const [passage, setPassage] = useState<BiblePassage | null>(null);
  const [passageLoading, setPassageLoading] = useState(false);
  const [passageError, setPassageError] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const featuredRef = parseVerseReference(verse.reference);

  const verseHero = useMemo(() => restVerseHeroText(verse.text), [verse.text]);
  const nextLine = useMemo(() => formatRestNextLabel(nextLabel), [nextLabel]);
  const progress = seconds > 0 ? Math.max(0, Math.min(1, remaining / seconds)) : 0;
  const urgent = remaining > 0 && remaining <= 10;

  useEffect(() => {
    if (!visible) {
      setReaderOpen(false);
      return;
    }
    prepareRestTimerDing();
    setRemaining(seconds);
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [visible, seconds, fadeAnim]);

  useEffect(() => {
    if (!visible || seconds <= 0) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          void playRestTimerDing();
          hapticNotify();
          onCompleteRef.current();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [visible, seconds]);

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
    if (!passage && passageError) loadPassage(true);
  };

  const passageBody =
    passage?.verses && passage.verses.length > 0 ? (
      <Text style={styles.readerPassage}>
        {passage.verses.map((v) => {
          const highlighted = isVerseHighlighted(v, featuredRef);
          return (
            <Text
              key={`${v.bookId}-${v.chapter}-${v.verse}`}
              style={highlighted ? styles.readerVerseHighlight : undefined}>
              <Text style={styles.readerVerseNum}>{v.verse} </Text>
              {v.text}{' '}
            </Text>
          );
        })}
      </Text>
    ) : (
      <Text style={styles.readerPassage}>{passage?.text ?? verse.text}</Text>
    );

  const referenceDisplay = verse.reference.trim().toUpperCase();

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View
        style={[
          styles.screen,
          {
            paddingTop: insets.top + (readerOpen ? 8 : 16),
            paddingBottom: insets.bottom + 12,
          },
        ]}>
        <View style={styles.stage}>
          {readerOpen ? (
            <View style={styles.readerStage}>
              <View style={styles.readerTopBar}>
                <Pressable
                  style={styles.readerBackBtn}
                  onPress={() => setReaderOpen(false)}
                  hitSlop={8}>
                  <MaterialIcons name="arrow-back" size={20} color={theme.colors.gold} />
                  <Text style={styles.readerBackTxt}>Back</Text>
                </Pressable>
                <View style={styles.readerTopSpacer} />
                <RestTimerPill remaining={remaining} />
              </View>

              <ScrollView
                style={styles.readerScroll}
                contentContainerStyle={[
                  styles.readerContent,
                  { paddingBottom: 24 },
                ]}
                showsVerticalScrollIndicator={false}>
              <Text style={styles.readerKicker}>Today&apos;s word</Text>
              <Text style={styles.readerTitle}>{referenceDisplay}</Text>
              {passage?.translationName ? (
                <Text style={styles.readerMeta}>{passage.translationName}</Text>
              ) : null}

              {passageLoading ? (
                <View style={styles.readerLoading}>
                  <ActivityIndicator color={theme.colors.gold} />
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

              <View style={styles.readerPullQuote}>
                <Text style={styles.readerPullQuoteText}>{verseHero.text}</Text>
              </View>
            </ScrollView>

              <View style={styles.heroFooter}>
                <Text style={styles.brandMark}>FLIGHT FITNESS</Text>
                <Pressable onPress={onSkip} hitSlop={12}>
                  <Text style={styles.skipGhost}>Skip rest</Text>
                </Pressable>
              </View>
            </View>
          ) : (
          <>
            <Text style={styles.restKickerPinned} pointerEvents="none">
              Rest
            </Text>
          <Animated.View style={[styles.hero, { opacity: fadeAnim }]}>
            <View style={styles.timerBlock}>
              <Text
                style={[styles.timer, urgent && styles.timerUrgent]}
                adjustsFontSizeToFit
                numberOfLines={1}
                minimumFontScale={0.55}
                accessibilityLabel={`${remaining} seconds remaining`}>
                {formatDuration(remaining)}
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              {nextLine ? (
                <Text style={styles.nextLine}>Next · {nextLine}</Text>
              ) : null}
            </View>

            <View style={styles.verseBlock}>
              {onVerseUpgradePress && verseUpgradeLabel ? (
                <Pressable
                  onPress={onVerseUpgradePress}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={verseUpgradeLabel}>
                  <Text style={styles.verseUpgrade}>{verseUpgradeLabel}</Text>
                </Pressable>
              ) : (
                <Text style={styles.verseKicker}>{verseSubtitle}</Text>
              )}
            <Pressable
              style={styles.verseBody}
              onPress={openReader}
              accessibilityRole="button"
              accessibilityLabel="Open full scripture passage">
              <Text style={styles.verseRef}>{referenceDisplay}</Text>
              <Text style={styles.verseText}>{verseHero.text}</Text>
              <View style={styles.verseTapRow}>
                <Text style={styles.verseTapHint}>
                  {verseHero.truncated ? 'Tap for full passage' : 'Tap to read in context'}
                </Text>
                <MaterialIcons name="east" size={14} color={theme.colors.gold} />
              </View>
              {passageLoading ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.gold}
                  style={styles.verseLoader}
                />
              ) : null}
            </Pressable>
            </View>

            <View style={styles.heroFooter}>
              <Text style={styles.brandMark}>FLIGHT FITNESS</Text>
              <Pressable onPress={onSkip} hitSlop={12}>
                <Text style={styles.skipGhost}>Skip rest</Text>
              </Pressable>
            </View>
          </Animated.View>
          </>
        )}
          <ConfettiBurst playKey={celebrateKey} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 28,
  },
  stage: {
    flex: 1,
    position: 'relative',
  },
  readerStage: {
    flex: 1,
  },
  hero: {
    flex: 1,
    justifyContent: 'space-between',
  },
  restKickerPinned: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 2,
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 4,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    paddingBottom: 12,
  },
  timerBlock: {
    paddingTop: 44,
  },
  timer: {
    fontFamily: theme.fonts.headline,
    fontSize: 132,
    lineHeight: 132,
    color: theme.colors.gold,
    letterSpacing: -2,
    marginTop: 8,
    marginBottom: 24,
    fontVariant: ['tabular-nums'],
  },
  timerUrgent: {
    color: theme.colors.onBackground,
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255, 215, 0, 0.18)',
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.gold,
  },
  nextLine: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2.5,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  verseBlock: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  verseBody: {
    flex: 1,
    justifyContent: 'center',
  },
  verseKicker: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 3,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  verseUpgrade: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2.2,
    color: 'rgba(255, 215, 0, 0.82)',
    textTransform: 'uppercase',
    marginBottom: 12,
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(255, 215, 0, 0.45)',
  },
  verseRef: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  verseText: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 26,
    lineHeight: 36,
    color: theme.colors.onBackground,
    letterSpacing: -0.3,
  },
  verseTapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 22,
  },
  verseTapHint: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 2,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  verseLoader: {
    position: 'absolute',
    right: 0,
    bottom: 24,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
    paddingTop: 14,
    paddingBottom: 4,
  },
  brandMark: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 9,
    letterSpacing: 3,
    color: theme.colors.onSurfaceVariant,
  },
  skipGhost: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  restPill: {
    borderWidth: 1,
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.surfaceContainerHigh,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 72,
  },
  restPillLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 8,
    letterSpacing: 1.5,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  restPillTime: {
    fontFamily: theme.fonts.headline,
    fontSize: 22,
    color: theme.colors.gold,
    letterSpacing: 1,
    marginTop: 2,
  },
  readerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  readerBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  readerBackTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  readerTopSpacer: { flex: 1 },
  readerScroll: { flex: 1 },
  readerContent: { paddingRight: 4 },
  readerKicker: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 3,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  readerTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: -0.5,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  readerMeta: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 24,
  },
  readerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  readerLoadingTxt: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  readerPassage: {
    fontFamily: theme.fonts.body,
    fontSize: 19,
    lineHeight: 32,
    color: theme.colors.onBackground,
    marginBottom: 28,
  },
  readerVerseNum: {
    fontFamily: theme.fonts.label,
    fontSize: 13,
    color: theme.colors.gold,
  },
  readerVerseHighlight: {
    backgroundColor: 'rgba(255, 215, 0, 0.14)',
  },
  readerFallbackNote: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  readerPullQuote: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.gold,
    paddingLeft: 16,
    marginTop: 8,
  },
  readerPullQuoteText: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 22,
    lineHeight: 30,
    color: theme.colors.gold,
    letterSpacing: -0.3,
  },
});
