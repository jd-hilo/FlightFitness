import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { hapticImpact, hapticNotify, ImpactStyle } from '@/lib/haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
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
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { ScreenHeader } from '@/components/ScreenHeader';
import { theme } from '@/constants/theme';
import {
  fetchCoachReflectionForDate,
  type CoachReflectionPrompt,
} from '@/lib/api/coachReflection';
import { fetchWebPassage } from '@/lib/bibleApi';
import { getDailyFaithReading } from '@/lib/faithReadings';
import { formatYmdLocal } from '@/lib/weekUtils';
import { useFaithDailyStore } from '@/stores/faithDailyStore';

function TaskCheck({ done }: { done: boolean }) {
  return (
    <View style={styles.checkHit}>
      <MaterialIcons
        name={done ? 'check-circle' : 'radio-button-unchecked'}
        size={28}
        color={done ? theme.colors.gold : theme.colors.onSurfaceVariant}
      />
    </View>
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
  const markJournalReflectionComplete = useFaithDailyStore(
    (s) => s.markJournalReflectionComplete
  );

  const scrollRef = useRef<ScrollView>(null);

  const day = byDay[dateKey] ?? {
    studyRead: false,
    journalDone: false,
    journalLine: '',
  };

  const [apiText, setApiText] = useState<string | null>(null);
  const [apiMeta, setApiMeta] = useState<string | null>(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [studyConfettiKey, setStudyConfettiKey] = useState(0);
  const [coachPrompt, setCoachPrompt] = useState<CoachReflectionPrompt | null>(
    null
  );

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

  return (
    <View style={styles.screen}>
      <ScreenHeader />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'height' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.scroll,
            {
              paddingBottom: insets.bottom + 16,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
        <Text style={styles.head}>Faith</Text>
        <Text style={styles.lead}>
          Bible study, daily reading, and small habits that anchor your training in
          something eternal.
        </Text>

        <View style={styles.streakCard}>
          <Text style={styles.streakLabel}>Faith streak</Text>
          <Text style={styles.streakNum}>{faithStreak}</Text>
        </View>

        <Text style={styles.section}>Today&apos;s study</Text>
        <View
          style={[styles.readingCard, day.studyRead && styles.taskShellDone]}>
          <View style={styles.taskHeader}>
            <View style={styles.checkHit}>
              <MaterialIcons
                name="menu-book"
                size={26}
                color={day.studyRead ? theme.colors.gold : theme.colors.onSurfaceVariant}
              />
            </View>
            <View style={styles.taskHeaderText}>
              <Text style={styles.taskHeaderTitle}>Read today&apos;s study</Text>
              <Text style={styles.taskHeaderSub}>
                The full passage loads automatically. Read it and the reflection, then
                mark it complete at the bottom.
              </Text>
            </View>
          </View>

          <View style={styles.studyBody}>
            <Text style={styles.readingTitle}>{reading.title}</Text>
            <Text style={styles.readingRef}>{reading.reference}</Text>
            {apiLoading ? (
              <View style={styles.passageLoading}>
                <AppLoadingCross size="small" />
                <Text style={styles.passageLoadingTxt}>Loading passage…</Text>
              </View>
            ) : (
              <>
                {apiMeta ? <Text style={styles.apiMeta}>{apiMeta}</Text> : null}
                <Text style={styles.readingPassage}>
                  {apiText?.trim() ?? reading.passage}
                </Text>
                {apiError && !apiText ? (
                  <Text style={styles.apiFallbackNote}>
                    Showing shortened offline text. Check your connection—the
                    full passage loads automatically when online.
                  </Text>
                ) : null}
              </>
            )}
            <Text style={styles.readingReflect}>{reading.reflection}</Text>
            <View style={styles.promptBox}>
              <Text style={styles.promptLabel}>
                {coachPrompt ? 'From your coach' : 'Reflect'}
              </Text>
              {coachPrompt?.title ? (
                <Text style={styles.promptText}>{coachPrompt.title}</Text>
              ) : null}
              <Text style={styles.promptText}>
                {coachPrompt?.body ?? reading.studyPrompt}
              </Text>
            </View>
            <Text style={styles.apiNote}>
              Passage from <Text style={styles.apiNoteEm}>bible-api.com</Text> (public
              domain).
            </Text>

            <View style={styles.checkOffWrap}>
              <Pressable
                style={[
                  styles.checkOffBtn,
                  day.studyRead && styles.checkOffBtnDone,
                ]}
                onPress={onToggleStudyRead}
                accessibilityRole="button"
                accessibilityLabel={
                  day.studyRead ? 'Mark study as not read' : 'Mark study as read'
                }>
                <MaterialIcons
                  name={day.studyRead ? 'check-circle' : 'radio-button-unchecked'}
                  size={26}
                  color={day.studyRead ? theme.colors.gold : theme.colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.checkOffTxt,
                    day.studyRead && styles.checkOffTxtDone,
                  ]}>
                  {day.studyRead ? "Completed — nice work" : 'Mark as read'}
                </Text>
              </Pressable>
              <ConfettiBurst playKey={studyConfettiKey} />
            </View>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.section}>Reflection</Text>
          <Pressable
            style={styles.pastBtn}
            onPress={() => router.push('/past-reflections')}
            hitSlop={8}
            accessibilityRole="button">
            <MaterialIcons name="history" size={15} color={theme.colors.gold} />
            <Text style={styles.pastBtnTxt}>Past reflections</Text>
          </Pressable>
        </View>
        <View
          style={[styles.journalCard, day.journalDone && styles.taskShellDone]}>
          <Pressable
            style={styles.taskHeader}
            onPress={() => toggleJournalDone(dateKey)}>
            <TaskCheck done={day.journalDone} />
            <View style={styles.taskHeaderText}>
              <Text style={styles.taskHeaderTitle}>Your reflection</Text>
              <Text style={styles.taskHeaderSub}>
                Respond to today&apos;s study above. When you&apos;re finished, tap the
                check to save it. Tap the check again to clear and start over.
              </Text>
            </View>
          </Pressable>
          <TextInput
            style={styles.journalInput}
            placeholder="e.g. The passage reminds me to trust God when training feels slow…"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={day.journalLine}
            onChangeText={(t) => setJournalLine(dateKey, t)}
            multiline
            returnKeyType="done"
            blurOnSubmit
            maxLength={280}
            onSubmitEditing={() => markJournalReflectionComplete(dateKey)}
            onFocus={scrollJournalIntoView}
          />
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  kav: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 8 },
  head: {
    fontFamily: theme.fonts.headline,
    fontSize: 36,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  lead: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 21,
    marginBottom: 20,
  },
  streakCard: {
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    padding: 20,
    marginBottom: 24,
  },
  streakLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  streakNum: {
    fontFamily: theme.fonts.headline,
    fontSize: 44,
    color: theme.colors.onBackground,
    marginVertical: 6,
  },
  section: {
    fontFamily: theme.fonts.headline,
    fontSize: 22,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: theme.colors.outlineStrong,
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  pastBtnTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 1,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  taskShellDone: {
    borderColor: 'rgba(255, 215, 0, 0.35)',
    backgroundColor: 'rgba(255, 215, 0, 0.06)',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineStrong,
    gap: 12,
  },
  checkHit: { marginRight: 0 },
  taskHeaderText: { flex: 1 },
  taskHeaderTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 15,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  taskHeaderSub: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 17,
  },
  readingCard: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerLow,
    marginBottom: 24,
  },
  studyBody: {
    padding: 20,
    paddingTop: 16,
  },
  readingTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 20,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  readingRef: {
    fontFamily: theme.fonts.label,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginBottom: 14,
  },
  passageLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  passageLoadingTxt: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
  },
  readingPassage: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    lineHeight: 26,
    color: theme.colors.onBackground,
    marginBottom: 16,
  },
  apiFallbackNote: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 14,
    fontStyle: 'italic',
  },
  readingReflect: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 16,
  },
  promptBox: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.gold,
    paddingLeft: 14,
    marginBottom: 16,
  },
  promptLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  promptText: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.onBackground,
  },
  apiNote: {
    fontFamily: theme.fonts.body,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 16,
    marginBottom: 12,
  },
  apiNoteEm: {
    fontFamily: theme.fonts.label,
    color: theme.colors.gold,
  },
  checkOffWrap: {
    marginTop: 18,
    position: 'relative',
  },
  checkOffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.outlineStrong,
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  checkOffBtnDone: {
    borderColor: 'rgba(255, 215, 0, 0.5)',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
  },
  checkOffTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    letterSpacing: 1.5,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  checkOffTxtDone: {
    color: theme.colors.gold,
  },
  apiMeta: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    color: theme.colors.gold,
    marginBottom: 8,
  },
  journalCard: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerLow,
    marginBottom: 32,
  },
  /** Match onboarding `styles.textArea` (+ insets for this card). */
  journalInput: {
    marginHorizontal: 16,
    marginBottom: 16,
    minHeight: 100,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 14,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.onBackground,
    textAlignVertical: 'top',
  },
});
