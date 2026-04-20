import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  InputAccessoryView,
  Keyboard,
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

import { ScreenHeader } from '@/components/ScreenHeader';
import { VerseCard } from '@/components/VerseCard';
import { theme } from '@/constants/theme';
import { fetchWebPassage } from '@/lib/bibleApi';
import { getDailyFaithReading } from '@/lib/faithReadings';
import { getDailyVerse } from '@/lib/verses';
import { useDailyContentStore } from '@/stores/dailyContentStore';
import { useFaithDailyStore } from '@/stores/faithDailyStore';

const JOURNAL_ACCESSORY_ID = 'faithJournalAccessory';

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
  const dateKey = new Date().toISOString().slice(0, 10);
  const reading = useMemo(() => getDailyFaithReading(), []);
  const dailyRemote = useDailyContentStore((s) => s.content);
  const dailyVerse = useMemo(
    () => dailyRemote?.verse ?? getDailyVerse(),
    [dailyRemote]
  );

  const byDay = useFaithDailyStore((s) => s.byDay);
  const faithStreak = useFaithDailyStore((s) => s.faithStreak);
  const toggleVerseRead = useFaithDailyStore((s) => s.toggleVerseRead);
  const toggleStudyRead = useFaithDailyStore((s) => s.toggleStudyRead);
  const toggleJournalDone = useFaithDailyStore((s) => s.toggleJournalDone);
  const setJournalLine = useFaithDailyStore((s) => s.setJournalLine);
  const markJournalReflectionComplete = useFaithDailyStore(
    (s) => s.markJournalReflectionComplete
  );

  const scrollRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const day = byDay[dateKey] ?? {
    verseRead: false,
    studyRead: false,
    journalDone: false,
    journalLine: '',
  };

  const [apiText, setApiText] = useState<string | null>(null);
  const [apiMeta, setApiMeta] = useState<string | null>(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

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

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const onJournalDone = useCallback(() => {
    Keyboard.dismiss();
    markJournalReflectionComplete(dateKey);
  }, [dateKey, markJournalReflectionComplete]);

  const scrollJournalIntoView = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 280);
  }, []);

  const kavOffset = insets.top + (Platform.OS === 'ios' ? 52 : 0);

  return (
    <View style={styles.screen}>
      <ScreenHeader />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={kavOffset}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.scroll,
            {
              paddingBottom:
                insets.bottom +
                120 +
                (Platform.OS === 'android' && keyboardHeight > 0 ? 52 : 0),
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive">
        <Text style={styles.head}>Faith</Text>
        <Text style={styles.lead}>
          Bible study, daily reading, and small habits that anchor your training in
          something eternal.
        </Text>

        <View style={styles.streakCard}>
          <Text style={styles.streakLabel}>Faith streak</Text>
          <Text style={styles.streakNum}>{faithStreak}</Text>
          <Text style={styles.streakSub}>
            Grows when you mark <Text style={styles.streakEm}>Today&apos;s study</Text> as
            read once per day (separate from workout streak).
          </Text>
        </View>

        <Text style={styles.section}>Daily verse</Text>
        <View
          style={[styles.taskShell, day.verseRead && styles.taskShellDone]}>
          <Pressable
            style={styles.taskHeader}
            onPress={() => toggleVerseRead(dateKey)}>
            <TaskCheck done={day.verseRead} />
            <View style={styles.taskHeaderText}>
              <Text style={styles.taskHeaderTitle}>Read today&apos;s verse</Text>
              <Text style={styles.taskHeaderSub}>
                Tap the check when you&apos;ve read it
              </Text>
            </View>
          </Pressable>
          <View style={styles.taskBody}>
            <VerseCard
              verse={dailyVerse}
              subtitle="Same verse for everyone today"
              embedded
            />
          </View>
        </View>

        <Text style={styles.section}>Today&apos;s study</Text>
        <View
          style={[styles.readingCard, day.studyRead && styles.taskShellDone]}>
          <Pressable
            style={styles.taskHeader}
            onPress={() => toggleStudyRead(dateKey)}>
            <TaskCheck done={day.studyRead} />
            <View style={styles.taskHeaderText}>
              <Text style={styles.taskHeaderTitle}>Read today&apos;s study</Text>
              <Text style={styles.taskHeaderSub}>
                The full passage loads automatically—tap the check when you&apos;ve read
                it and the reflection below
              </Text>
            </View>
          </Pressable>

          <View style={styles.studyBody}>
            <Text style={styles.readingTitle}>{reading.title}</Text>
            <Text style={styles.readingRef}>{reading.reference}</Text>
            {apiLoading ? (
              <View style={styles.passageLoading}>
                <ActivityIndicator color={theme.colors.gold} />
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
              <Text style={styles.promptLabel}>Reflect</Text>
              <Text style={styles.promptText}>{reading.studyPrompt}</Text>
            </View>
            <Text style={styles.apiNote}>
              Passage from <Text style={styles.apiNoteEm}>bible-api.com</Text> (public
              domain).
            </Text>
          </View>
        </View>

        <Text style={styles.section}>Reflection</Text>
        <View
          style={[styles.journalCard, day.journalDone && styles.taskShellDone]}>
          <Pressable
            style={styles.taskHeader}
            onPress={() => toggleJournalDone(dateKey)}>
            <TaskCheck done={day.journalDone} />
            <View style={styles.taskHeaderText}>
              <Text style={styles.taskHeaderTitle}>Your reflection</Text>
              <Text style={styles.taskHeaderSub}>
                Respond to today&apos;s study above. When you&apos;re finished, tap
                Done on the keyboard — we&apos;ll check it off. Tap the check again to
                clear and start over.
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
            maxLength={280}
            textAlignVertical="top"
            inputAccessoryViewID={
              Platform.OS === 'ios' ? JOURNAL_ACCESSORY_ID : undefined
            }
            onFocus={scrollJournalIntoView}
          />
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={JOURNAL_ACCESSORY_ID}>
          <View style={styles.inputAccessory}>
            <Pressable
              onPress={onJournalDone}
              style={styles.inputAccessoryDoneHit}
              hitSlop={12}>
              <Text style={styles.inputAccessoryDone}>Done</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}

      {Platform.OS === 'android' && keyboardHeight > 0 ? (
        <View style={[styles.androidKbBar, { bottom: keyboardHeight }]}>
          <Pressable onPress={onJournalDone} style={styles.androidKbDoneHit}>
            <Text style={styles.androidKbDone}>Done</Text>
          </Pressable>
        </View>
      ) : null}
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
  streakSub: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 17,
  },
  streakEm: {
    fontFamily: theme.fonts.label,
    color: theme.colors.gold,
  },
  section: {
    fontFamily: theme.fonts.headline,
    fontSize: 22,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 8,
  },
  taskShell: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerLow,
    marginBottom: 8,
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
  taskBody: {
    paddingBottom: 4,
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
  journalInput: {
    marginHorizontal: 16,
    marginBottom: 16,
    minHeight: 120,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.background,
    color: theme.colors.onBackground,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    lineHeight: 22,
    padding: 14,
  },
  inputAccessory: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerHigh,
  },
  inputAccessoryDoneHit: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  inputAccessoryDone: {
    fontFamily: theme.fonts.label,
    fontSize: 16,
    letterSpacing: 1,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  androidKbBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.outline,
  },
  androidKbDoneHit: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  androidKbDone: {
    fontFamily: theme.fonts.label,
    fontSize: 14,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
});
