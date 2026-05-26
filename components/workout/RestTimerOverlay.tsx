import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import type { BiblePassage } from '@/lib/bibleApi';
import { formatDuration } from '@/lib/formatDuration';
import {
  fetchVersePassageContext,
  isVerseHighlighted,
  parseVerseReference,
  truncateVersePreview,
} from '@/lib/versePassage';
import type { VerseEntry } from '@/lib/verses';

type Props = {
  visible: boolean;
  seconds: number;
  verse: VerseEntry;
  nextLabel: string;
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
  nextLabel,
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
  const featuredRef = parseVerseReference(verse.reference);
  const previewText = truncateVersePreview(verse.text);

  useEffect(() => {
    if (!visible) {
      setReaderOpen(false);
      setPassage(null);
      setPassageError(false);
      return;
    }
    setRemaining(seconds);
  }, [visible, seconds]);

  useEffect(() => {
    if (!visible || seconds <= 0) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          onCompleteRef.current();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [visible, seconds]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setPassageLoading(true);
    setPassageError(false);
    void fetchVersePassageContext(verse).then((res) => {
      if (cancelled) return;
      setPassageLoading(false);
      if (res) {
        setPassage(res);
      } else {
        setPassageError(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visible, verse.id, verse.reference]);

  const openReader = () => {
    if (passage || passageError) setReaderOpen(true);
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

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View
        style={[
          styles.backdrop,
          {
            paddingTop: insets.top + (readerOpen ? 12 : 24),
            paddingBottom: insets.bottom + 24,
          },
        ]}>
        {readerOpen ? (
          <>
            <View style={[styles.readerTopBar, { paddingHorizontal: 20 }]}>
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
                { paddingBottom: insets.bottom + 100 },
              ]}
              showsVerticalScrollIndicator={false}>
              <Text style={styles.readerKicker}>Scripture</Text>
              <Text style={styles.readerTitle}>{verse.reference}</Text>
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
                    <Text style={styles.readerFallbackNote}>
                      Full passage unavailable offline — showing today&apos;s verse.
                    </Text>
                  ) : null}
                </>
              )}

              <View style={styles.readerFeaturedBox}>
                <Text style={styles.readerFeaturedLabel}>Today&apos;s word</Text>
                <Text style={styles.readerFeaturedText}>&ldquo;{verse.text}&rdquo;</Text>
              </View>
            </ScrollView>

            <View style={[styles.readerFooter, { paddingBottom: insets.bottom + 16 }]}>
              <Pressable style={styles.skipBtn} onPress={onSkip}>
                <Text style={styles.skipTxt}>Skip rest</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.cardWrap}>
            <View style={styles.card}>
              <Text style={styles.kicker}>Rest</Text>
              <Text style={styles.timer}>{formatDuration(remaining)}</Text>
              <Text style={styles.next}>{nextLabel}</Text>

              <View style={styles.verseBox}>
                <Text style={styles.verseRef}>{verse.reference}</Text>
                <Text style={styles.verseText} numberOfLines={3}>
                  &ldquo;{previewText}&rdquo;
                </Text>
                <Pressable
                  style={[
                    styles.readMoreBtn,
                    passageLoading && styles.readMoreBtnDisabled,
                  ]}
                  onPress={openReader}
                  disabled={passageLoading && !passageError}>
                  {passageLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.gold} />
                  ) : (
                    <>
                      <Text style={styles.readMoreTxt}>Read more</Text>
                      <MaterialIcons name="menu-book" size={16} color={theme.colors.gold} />
                    </>
                  )}
                </Pressable>
              </View>

              <Pressable style={styles.skipBtn} onPress={onSkip}>
                <Text style={styles.skipTxt}>Skip rest</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    paddingHorizontal: 24,
  },
  cardWrap: { flex: 1, justifyContent: 'center' },
  card: {
    borderWidth: 1,
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 28,
    alignItems: 'center',
  },
  kicker: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  timer: {
    fontFamily: theme.fonts.headline,
    fontSize: 64,
    color: theme.colors.gold,
    letterSpacing: 2,
    marginBottom: 8,
  },
  next: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 24,
  },
  verseBox: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineStrong,
    paddingTop: 20,
    marginBottom: 24,
  },
  verseRef: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 1.5,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'center',
  },
  verseText: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.onBackground,
    textAlign: 'center',
    marginBottom: 14,
  },
  readMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: theme.colors.gold,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  readMoreBtnDisabled: { opacity: 0.7 },
  readMoreTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 1.5,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  skipBtn: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    paddingHorizontal: 28,
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.5,
    color: theme.colors.onBackground,
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
    marginBottom: 16,
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
  readerContent: { paddingHorizontal: 4 },
  readerKicker: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  readerTitle: {
    fontFamily: theme.fonts.headline,
    fontSize: 28,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  readerMeta: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 20,
  },
  readerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  readerLoadingTxt: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  readerPassage: {
    fontFamily: theme.fonts.body,
    fontSize: 17,
    lineHeight: 28,
    color: theme.colors.onBackground,
    marginBottom: 24,
  },
  readerVerseNum: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    color: theme.colors.gold,
  },
  readerVerseHighlight: {
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
  },
  readerFallbackNote: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  readerFeaturedBox: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 18,
    marginTop: 8,
  },
  readerFeaturedLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 1.5,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  readerFeaturedText: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.onBackground,
  },
  readerFooter: {
    paddingTop: 12,
    paddingHorizontal: 4,
  },
});
