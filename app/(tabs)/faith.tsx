import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { hapticImpact, hapticNotify, ImpactStyle } from '@/lib/haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLoadingCross } from '@/components/AppLoadingCross';
import { DailyDevotionalPrompt } from '@/components/DailyDevotionalPrompt';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { FrostedCard, frostedTile, pageTitleStyle } from '@/components/FrostedCard';
import { SunriseBackdrop, sunriseImage } from '@/components/SunriseBackdrop';
import { theme } from '@/constants/theme';
import { fetchCoachReflectionForDate, type CoachReflectionPrompt } from '@/lib/api/coachReflection';
import { fetchWebPassage } from '@/lib/bibleApi';
import { getDailyFaithReading, type FaithReading } from '@/lib/faithReadings';
import { formatYmdLocal, parseYmdLocal } from '@/lib/weekUtils';
import { useFaithDailyStore } from '@/stores/faithDailyStore';

const RECENT_DAYS = 3;
const THUMB_TINTS = ['rgba(255,170,90,0.12)', 'rgba(70,130,80,0.55)', 'rgba(80,90,170,0.55)'];
const THUMB_SIZE = 52;
const THUMB_IMAGE_WIDTH = 150;
const HEADER_TOP = 14;
const DEVO_CARD_BOTTOM = 190;

type RecentDevotional = {
  dateKey: string;
  label: string;
  read: boolean;
  reading: FaithReading;
};

/** Matches the rotating study the Faith tab showed on that day. */
function readingForDateKey(dateKey: string) {
  return getDailyFaithReading(new Date(`${dateKey}T12:00:00Z`));
}

function TaskCheck({ done }: { done: boolean }) {
  return (
    <MaterialIcons
      name={done ? 'check-circle' : 'radio-button-unchecked'}
      size={26}
      color={done ? theme.colors.champagne : theme.colors.onSurfaceVariant}
    />
  );
}

export default function FaithScreen() {
  const insets = useSafeAreaInsets();
  const dateKey = formatYmdLocal(new Date());
  const reading = useMemo(() => getDailyFaithReading(), []);

  const byDay = useFaithDailyStore((s) => s.byDay);
  const faithStreak = useFaithDailyStore((s) => s.faithStreak);
  const toggleStudyRead = useFaithDailyStore((s) => s.toggleStudyRead);
  const toggleJournalDone = useFaithDailyStore((s) => s.toggleJournalDone);
  const setJournalLine = useFaithDailyStore((s) => s.setJournalLine);
  const markJournalReflectionComplete = useFaithDailyStore((s) => s.markJournalReflectionComplete);

  const scrollRef = useRef<ScrollView>(null);
  const journalRef = useRef<TextInput>(null);

  const day = byDay[dateKey] ?? {
    studyRead: false,
    journalDone: false,
    journalLine: '',
  };

  const [expanded, setExpanded] = useState(false);
  const [apiText, setApiText] = useState<string | null>(null);
  const [apiMeta, setApiMeta] = useState<string | null>(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [studyConfettiKey, setStudyConfettiKey] = useState(0);
  const [coachPrompt, setCoachPrompt] = useState<CoachReflectionPrompt | null>(null);
  const [openRecent, setOpenRecent] = useState<RecentDevotional | null>(null);

  const recent = useMemo<RecentDevotional[]>(() => {
    const out: RecentDevotional[] = [];
    for (let i = 1; i <= RECENT_DAYS; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = formatYmdLocal(d);
      out.push({
        dateKey: key,
        label:
          i === 1
            ? 'Yesterday'
            : parseYmdLocal(key).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              }),
        read: Boolean(byDay[key]?.studyRead),
        reading: readingForDateKey(key),
      });
    }
    return out;
  }, [byDay]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const prompt = await fetchCoachReflectionForDate(dateKey);
      if (!cancelled) setCoachPrompt(prompt);
    })();
    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  const onToggleStudyRead = useCallback(() => {
    const wasRead = day.studyRead;
    toggleStudyRead(dateKey);
    if (!wasRead) {
      hapticNotify();
      setStudyConfettiKey((k) => k + 1);
    } else {
      hapticImpact(ImpactStyle.Light);
    }
  }, [day.studyRead, dateKey, toggleStudyRead]);

  const loadFromApi = useCallback(async () => {
    setApiLoading(true);
    setApiError(false);
    const res = await fetchWebPassage(reading.apiSlug);
    setApiLoading(false);
    if (res) {
      setApiText(res.text);
      setApiMeta(`${res.reference} · ${res.translationName}`);
    } else {
      setApiText(null);
      setApiMeta(null);
      setApiError(true);
    }
  }, [reading.apiSlug]);

  useEffect(() => {
    void loadFromApi();
  }, [loadFromApi]);

  /** Same timing as onboarding `scrollNotesToEnd` so the field stays visible above the keyboard. */
  const scrollJournalIntoView = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
  }, []);

  const toggleExpanded = () => {
    hapticImpact(ImpactStyle.Light);
    setExpanded((v) => !v);
  };

  const reflectionStatus = day.journalDone
    ? 'Completed today'
    : day.journalLine.trim()
      ? 'Draft saved · tap to finish'
      : 'Write today’s reflection';

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'height' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive">
          <SunriseBackdrop
            height={insets.top + DEVO_CARD_BOTTOM + 150}
            horizonY={insets.top + DEVO_CARD_BOTTOM - 8}
            topScrim={insets.top + 120}
          />

          <View style={[styles.content, { paddingTop: insets.top + HEADER_TOP }]}>
            <View style={styles.headRow}>
              <Text style={styles.head}>Faith</Text>
              <Pressable
                style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
                onPress={() => router.push('/past-reflections')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Past reflections">
                <MaterialIcons name="calendar-today" size={24} color={theme.colors.onBackground} />
              </Pressable>
            </View>

            <Pressable
              onPress={toggleExpanded}
              style={({ pressed }) => [styles.devoWrap, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Today's devotional: ${reading.title}`}>
              <FrostedCard style={styles.devoCard} intensity={36}>
                <View style={styles.devoText}>
                  <Text style={styles.kicker}>Today&apos;s devotional</Text>
                  <Text
                    style={styles.devoTitle}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}>
                    {reading.title}
                  </Text>
                  <Text style={styles.devoRef} numberOfLines={1}>
                    {reading.reference}
                  </Text>
                </View>
                <MaterialIcons
                  name={day.studyRead ? 'check-circle' : expanded ? 'expand-less' : 'chevron-right'}
                  size={26}
                  color={day.studyRead ? theme.colors.champagne : theme.colors.onBackground}
                />
              </FrostedCard>
            </Pressable>

            <Text style={styles.quote}>“{reading.passage}”</Text>
            <Text style={styles.quoteRef}>{reading.reference}</Text>

            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              onPress={toggleExpanded}
              accessibilityRole="button">
              <Text style={styles.primaryBtnTxt}>
                {expanded ? 'Hide Devotional' : 'Read Full Devotional'}
              </Text>
            </Pressable>

            {expanded ? (
              <View style={[styles.studyCard, day.studyRead && styles.cardDone]}>
                {apiLoading ? (
                  <View style={styles.passageLoading}>
                    <AppLoadingCross size="small" />
                    <Text style={styles.muted}>Loading passage…</Text>
                  </View>
                ) : (
                  <>
                    {apiMeta ? <Text style={styles.apiMeta}>{apiMeta}</Text> : null}
                    <Text style={styles.readingPassage}>{apiText?.trim() ?? reading.passage}</Text>
                    {apiError && !apiText ? (
                      <Text style={styles.smallNote}>
                        Showing shortened offline text. The full passage loads automatically when
                        you&apos;re online.
                      </Text>
                    ) : null}
                  </>
                )}
                <Text style={styles.readingReflect}>{reading.reflection}</Text>
                <Text style={styles.smallNote}>
                  Passage from <Text style={styles.smallNoteEm}>bible-api.com</Text> (public
                  domain).
                </Text>

                <View style={styles.checkOffWrap}>
                  <Pressable
                    style={[styles.checkOffBtn, day.studyRead && styles.checkOffBtnDone]}
                    onPress={onToggleStudyRead}
                    accessibilityRole="button"
                    accessibilityLabel={
                      day.studyRead ? 'Mark devotional as not read' : 'Mark devotional as read'
                    }>
                    <TaskCheck done={day.studyRead} />
                    <Text style={[styles.checkOffTxt, day.studyRead && styles.checkOffTxtDone]}>
                      {day.studyRead ? 'Completed — nice work' : 'Mark as read'}
                    </Text>
                  </Pressable>
                  <ConfettiBurst playKey={studyConfettiKey} />
                </View>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [styles.reflectTile, pressed && styles.pressed]}
              onPress={() => journalRef.current?.focus()}
              accessibilityRole="button"
              accessibilityLabel={`Reflection. ${reflectionStatus}`}>
              <MaterialIcons
                name={day.journalDone ? 'check-circle-outline' : 'edit'}
                size={26}
                color={day.journalDone ? theme.colors.champagne : theme.colors.onBackground}
              />
              <Text style={styles.reflectTitle} numberOfLines={1}>
                Reflection
              </Text>
              <Text style={styles.reflectSub} numberOfLines={1}>
                {reflectionStatus}
              </Text>
              {faithStreak > 0 ? (
                <View style={styles.streakChip}>
                  <MaterialIcons
                    name="local-fire-department"
                    size={14}
                    color={theme.colors.champagne}
                  />
                  <Text style={styles.streakChipTxt}>{faithStreak}</Text>
                </View>
              ) : null}
            </Pressable>

            <Text style={[styles.section, styles.sectionHeading]}>Recent</Text>
            {recent.map((item, i) => (
              <Pressable
                key={item.dateKey}
                style={({ pressed }) => [styles.recentRow, pressed && styles.pressed]}
                onPress={() => setOpenRecent(item)}
                accessibilityRole="button"
                accessibilityLabel={item.reading.title}>
                <View style={styles.thumb}>
                  <Image source={sunriseImage} resizeMode="cover" style={styles.thumbImg} />
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      { backgroundColor: THUMB_TINTS[i % THUMB_TINTS.length] },
                    ]}
                  />
                </View>
                <View style={styles.recentText}>
                  <Text style={styles.recentTitle} numberOfLines={1}>
                    {item.reading.title}
                  </Text>
                  <Text style={styles.recentMeta} numberOfLines={1}>
                    {item.reading.reference} · {item.label}
                  </Text>
                </View>
                {item.read ? (
                  <MaterialIcons name="check-circle" size={18} color={theme.colors.champagne} />
                ) : null}
                <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.55)" />
              </Pressable>
            ))}

            <View style={styles.sectionRow}>
              <Text style={styles.section}>Today&apos;s reflection</Text>
              <Pressable
                onPress={() => router.push('/past-reflections')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="See all past reflections">
                <Text style={styles.seeAll}>See All</Text>
              </Pressable>
            </View>
            <View style={[styles.journalCard, day.journalDone && styles.cardDone]}>
              <Pressable style={styles.journalHeader} onPress={() => toggleJournalDone(dateKey)}>
                <TaskCheck done={day.journalDone} />
                <View style={styles.journalHeaderText}>
                  <Text style={styles.promptLabel}>
                    {coachPrompt ? 'From your coach' : 'Reflect'}
                  </Text>
                  {coachPrompt?.title ? (
                    <Text style={styles.promptText}>{coachPrompt.title}</Text>
                  ) : null}
                  <Text style={styles.promptText}>{coachPrompt?.body ?? reading.studyPrompt}</Text>
                </View>
              </Pressable>
              <TextInput
                ref={journalRef}
                style={styles.journalInput}
                placeholder="e.g. The passage reminds me to trust God when training feels slow…"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                value={day.journalLine}
                onChangeText={(t) => setJournalLine(dateKey, t)}
                multiline
                returnKeyType="done"
                submitBehavior="blurAndSubmit"
                maxLength={280}
                onSubmitEditing={() => markJournalReflectionComplete(dateKey)}
                onFocus={scrollJournalIntoView}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={openRecent != null}
        animationType="fade"
        transparent
        onRequestClose={() => setOpenRecent(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpenRecent(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.kicker}>{openRecent?.label}</Text>
                <Text style={styles.modalTitle}>{openRecent?.reading.title}</Text>
                <Text style={styles.devoRef}>{openRecent?.reading.reference}</Text>
              </View>
              <Pressable onPress={() => setOpenRecent(null)} hitSlop={12}>
                <MaterialIcons name="close" size={22} color={theme.colors.onSurfaceVariant} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.readingPassage}>“{openRecent?.reading.passage}”</Text>
              <Text style={styles.readingReflect}>{openRecent?.reading.reflection}</Text>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      <DailyDevotionalPrompt />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  kav: { flex: 1 },
  content: { paddingHorizontal: 16 },
  pressed: { opacity: 0.85 },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  head: pageTitleStyle,
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  devoWrap: { marginTop: 28 },
  devoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 118,
    paddingHorizontal: 18,
    paddingVertical: 20,
    gap: 12,
    backgroundColor: 'rgba(16,12,10,0.5)',
    borderColor: 'rgba(255,255,255,0.16)',
  },
  devoText: { flex: 1, minWidth: 0 },
  kicker: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.72)',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  devoTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 21,
    letterSpacing: -0.3,
    color: theme.colors.onBackground,
    textTransform: 'capitalize',
  },
  devoRef: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 6,
  },
  quote: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.onBackground,
    textAlign: 'center',
    marginTop: 30,
    paddingHorizontal: 4,
  },
  quoteRef: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.6,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 12,
  },
  primaryBtn: {
    backgroundColor: theme.colors.champagne,
    borderRadius: theme.radii.full,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  primaryBtnTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 15,
    color: theme.colors.onChampagne,
  },
  studyCard: {
    ...frostedTile,
    padding: 16,
    marginTop: 10,
  },
  cardDone: {
    borderColor: 'rgba(235,213,174,0.4)',
    backgroundColor: 'rgba(235,213,174,0.06)',
  },
  passageLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  muted: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
  },
  apiMeta: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    color: theme.colors.champagne,
    marginBottom: 8,
  },
  readingPassage: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    lineHeight: 26,
    color: theme.colors.onBackground,
    marginBottom: 16,
  },
  readingReflect: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 16,
  },
  smallNote: {
    fontFamily: theme.fonts.body,
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 12,
  },
  smallNoteEm: {
    fontFamily: theme.fonts.label,
    color: theme.colors.champagne,
  },
  checkOffWrap: {
    marginTop: 8,
    position: 'relative',
  },
  checkOffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.outlineStrong,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: theme.radii.full,
  },
  checkOffBtnDone: {
    borderColor: 'rgba(235,213,174,0.5)',
    backgroundColor: 'rgba(235,213,174,0.08)',
  },
  checkOffTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 15,
    color: theme.colors.onBackground,
  },
  checkOffTxtDone: { color: theme.colors.champagne },
  reflectTile: {
    ...frostedTile,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 18,
  },
  reflectTitle: {
    fontFamily: theme.fonts.label,
    fontSize: 14,
    color: theme.colors.onBackground,
    marginTop: 10,
  },
  reflectSub: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 3,
  },
  streakChip: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.champagneSoft,
  },
  streakChipTxt: {
    fontFamily: theme.fonts.labelBold,
    fontSize: 12,
    color: theme.colors.champagne,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 12,
  },
  section: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    letterSpacing: -0.3,
    color: theme.colors.onBackground,
  },
  sectionHeading: { marginTop: 26, marginBottom: 12 },
  seeAll: {
    fontFamily: theme.fonts.label,
    fontSize: 14,
    color: theme.colors.metricBlue,
  },
  recentRow: {
    ...frostedTile,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 12,
    marginBottom: 8,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceContainerHigh,
  },
  thumbImg: {
    position: 'absolute',
    width: THUMB_IMAGE_WIDTH,
    height: THUMB_IMAGE_WIDTH * (1024 / 472),
    left: -(THUMB_IMAGE_WIDTH - THUMB_SIZE),
    top: -(THUMB_IMAGE_WIDTH * (1024 / 472) * 0.518 - THUMB_SIZE * 0.55),
  },
  recentText: { flex: 1, minWidth: 0 },
  recentTitle: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 15,
    color: theme.colors.onBackground,
    textTransform: 'capitalize',
  },
  recentMeta: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  journalCard: {
    ...frostedTile,
    marginBottom: 12,
  },
  journalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  journalHeaderText: { flex: 1 },
  promptLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.6,
    color: theme.colors.champagne,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  promptText: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.onBackground,
  },
  journalInput: {
    marginHorizontal: 14,
    marginBottom: 14,
    minHeight: 84,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 14,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.onBackground,
    textAlignVertical: 'top',
    borderRadius: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.glassEdge,
    padding: 20,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  modalHeaderText: { flex: 1 },
  modalTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 20,
    color: theme.colors.onBackground,
    textTransform: 'capitalize',
  },
  modalScroll: { flexGrow: 0 },
});
