import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoachChatHeaderButton } from '@/components/CoachChatHeaderButton';
import { MacroDashboard } from '@/components/plan/MacroDashboard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { theme } from '@/constants/theme';
import { supabaseConfigured } from '@/lib/supabase';
import { getDailyVerse, getTriggerVerse } from '@/lib/verses';
import { useDailyContentStore } from '@/stores/dailyContentStore';
import {
  dateKeyForViewStripDay,
  mealDayIndexForViewStrip,
  viewStripIndexForToday,
  viewWeekStartYmdLocal,
} from '@/lib/weekUtils';
import { sumMacrosForMeals } from '@/lib/mealTotals';
import {
  normalizeDay,
  useCompletionStore,
} from '@/stores/completionStore';
import { usePlanStore } from '@/stores/planStore';
import { useUiStore } from '@/stores/uiStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useVerseModalStore } from '@/stores/verseModalStore';

const HOME_HERO_SOURCE = require('@/assets/images/home-hero.png');

const HERO_H = 400;

function formatTimeLabel(d: Date) {
  let h = d.getHours();
  const m = d.getMinutes();
  const am = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${h}:${mm} ${am}`;
}

function intensityFromHour(h: number) {
  if (h >= 5 && h < 12) return 'HIGH';
  if (h >= 12 && h < 17) return 'MEDIUM';
  return 'LOW';
}

function verseWatermark(ref: string) {
  const compact = ref.replace(/\s+/g, ' ').trim();
  const book = compact.split(/\d/)[0]?.trim() ?? compact;
  const num = compact.slice(book.length).trim();
  const abbr = book
    .split(/\s+/)
    .map((w) => w.slice(0, 3).toUpperCase())
    .join(' ');
  const head = num.split(/[,\s–-]/)[0] ?? num;
  return `${abbr.split(' ').slice(0, 2).join(' ')} ${head}`.trim().slice(0, 14);
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const weekStart = usePlanStore((s) => s.weekStart);
  const macroTargets = usePlanStore((s) => s.macroTargets);
  const mealsByDay = usePlanStore((s) => s.mealsByDay);
  const workoutsByDay = usePlanStore((s) => s.workoutsByDay);
  const setSelectedPlanDay = useUiStore((s) => s.setSelectedPlanDay);
  const byDay = useCompletionStore((s) => s.byDay);
  const toggleMeal = useCompletionStore((s) => s.toggleMeal);
  const toggleWorkout = useCompletionStore((s) => s.toggleWorkout);
  const backfillExerciseIdsIfWorkoutDone = useCompletionStore(
    (s) => s.backfillExerciseIdsIfWorkoutDone
  );
  const streak = useCompletionStore((s) => s.streak);
  const showVerse = useVerseModalStore((s) => s.show);
  const dailyRemote = useDailyContentStore((s) => s.content);
  const dailyLoading = useDailyContentStore((s) => s.loading);
  const dailyFetchSettled = useDailyContentStore((s) => s.dailyFetchSettled);
  const tier = useSubscriptionStore((s) => s.tier);
  const remoteHeroUrl = dailyRemote?.image_url;
  const heroFadeOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    heroFadeOpacity.setValue(0);
  }, [remoteHeroUrl, heroFadeOpacity]);

  /** Same mapping as Fuel/Train: calendar week (Mon–Sun) ↔ plan `mealsByDay` / `workoutsByDay` index. */
  const viewWeekYmd = viewWeekStartYmdLocal();
  const stripToday = viewStripIndexForToday(viewWeekYmd);
  const planDayIndex =
    weekStart != null
      ? mealDayIndexForViewStrip(weekStart, viewWeekYmd, stripToday)
      : null;
  const dateKey = dateKeyForViewStripDay(viewWeekYmd, stripToday);
  const dayMeals =
    planDayIndex != null && mealsByDay ? mealsByDay[planDayIndex] ?? [] : [];
  const workout =
    planDayIndex != null && workoutsByDay
      ? workoutsByDay[planDayIndex] ?? null
      : null;
  const completion = normalizeDay(byDay[dateKey]);

  const hasPlan = Boolean(weekStart && macroTargets && mealsByDay);

  useEffect(() => {
    if (weekStart) setSelectedPlanDay(stripToday);
  }, [weekStart, setSelectedPlanDay, stripToday]);

  useEffect(() => {
    if (!weekStart || !workoutsByDay || !dateKey || planDayIndex == null) return;
    const w = workoutsByDay[planDayIndex];
    if (!w) return;
    backfillExerciseIdsIfWorkoutDone(
      dateKey,
      w.exercises.map((e) => e.id)
    );
  }, [
    weekStart,
    workoutsByDay,
    planDayIndex,
    dateKey,
    backfillExerciseIdsIfWorkoutDone,
  ]);

  const verse = useMemo(
    () => dailyRemote?.verse ?? getDailyVerse(),
    [dailyRemote]
  );
  const hasRemoteHero = Boolean(dailyRemote?.image_url);
  /** Don’t flash bundled hero while waiting for today’s remote image from Supabase. */
  const showHeroPlaceholder = useMemo(
    () =>
      supabaseConfigured &&
      !hasRemoteHero &&
      (!dailyFetchSettled || dailyLoading),
    [hasRemoteHero, dailyFetchSettled, dailyLoading]
  );
  const now = useMemo(() => new Date(), []);
  const timeLine = `${formatTimeLabel(now).toUpperCase()} // INTENSITY: ${intensityFromHour(
    now.getHours()
  )}`;
  const watermark = verseWatermark(verse.reference);

  const recentKeys = useMemo(
    () => Object.keys(byDay).sort().slice(-7),
    [byDay]
  );

  const logged = useMemo(() => {
    const done = dayMeals.filter((m) => completion.mealIds.includes(m.id));
    return sumMacrosForMeals(done);
  }, [dayMeals, completion.mealIds]);

  const onMealToggle = (mealId: string) => {
    if (!dateKey) return;
    const nowDone = toggleMeal(dateKey, mealId);
    if (nowDone) {
      const v = getTriggerVerse('gratitude', `${dateKey}-${mealId}`);
      showVerse(v, 'Fuel the temple — one meal at a time.');
    }
  };

  const onWorkoutToggle = () => {
    if (!dateKey) return;
    const ids = workout?.exercises.map((e) => e.id) ?? [];
    const nowDone = toggleWorkout(dateKey, ids);
    if (nowDone) {
      const v = getTriggerVerse('discipline', `${dateKey}-w`);
      showVerse(v, 'Strength is built in faithful reps.');
    }
  };

  const onShareInsight = async () => {
    try {
      await Share.share({
        message: `"${verse.text}" — ${verse.reference}`,
      });
    } catch {
      /* ignore */
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        rightSlot={tier === 'coaching' ? <CoachChatHeaderButton /> : undefined}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          {hasRemoteHero && dailyRemote?.image_url ? (
            <Animated.Image
              key={dailyRemote.image_url}
              source={{ uri: dailyRemote.image_url }}
              style={[styles.heroImg, { opacity: heroFadeOpacity }]}
              resizeMode="cover"
              onLoad={() => {
                Animated.timing(heroFadeOpacity, {
                  toValue: 0.85,
                  duration: 520,
                  useNativeDriver: true,
                }).start();
              }}
              onError={() => {
                Animated.timing(heroFadeOpacity, {
                  toValue: 0.85,
                  duration: 280,
                  useNativeDriver: true,
                }).start();
              }}
            />
          ) : showHeroPlaceholder ? (
            <View style={[styles.heroImg, styles.heroPlaceholder]} />
          ) : (
            <Image
              source={HOME_HERO_SOURCE}
              style={[styles.heroImg, styles.heroOp]}
              resizeMode="cover"
            />
          )}
          <LinearGradient
            colors={['#131313', 'rgba(19,19,19,0.4)', 'rgba(19,19,19,0)']}
            locations={[0, 0.5, 1]}
            style={styles.heroGrad}
          />
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroKicker}>{timeLine}</Text>
            <Text style={styles.heroTitle}>
              Morning,{' '}
              <Text style={styles.heroName}>Marcus</Text>
            </Text>
          </View>
        </View>

        <View style={styles.contentPull}>
          <View style={styles.wordCard}>
            <Text style={styles.wordBgRef}>{watermark}</Text>
            <View style={styles.wordRuleRow}>
              <View style={styles.wordRule} />
              <Text style={styles.wordSectionLabel}>The Word</Text>
            </View>
            <Text style={styles.wordQuote}>&ldquo;{verse.text}&rdquo;</Text>
            <Text style={styles.wordRef}>
              {verse.reference.toUpperCase()} // Wisdom Series
            </Text>
            <View style={styles.wordBtns}>
              <Pressable
                style={styles.btnGold}
                onPress={() => router.push('/(tabs)/faith')}>
                <Text style={styles.btnGoldTxt}>Study Context</Text>
              </Pressable>
              <Pressable style={styles.btnOutline} onPress={onShareInsight}>
                <Text style={styles.btnOutlineTxt}>Share Insight</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={styles.faithTeaser}
            onPress={() => router.push('/(tabs)/faith')}>
            <MaterialIcons name="menu-book" size={22} color={theme.colors.gold} />
            <View style={styles.faithTeaserText}>
              <Text style={styles.faithTeaserTitle}>Faith &amp; Bible study</Text>
              <Text style={styles.faithTeaserSub}>
                Daily reading, full passages, and habit check-ins
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={theme.colors.onSurfaceVariant}
            />
          </Pressable>

          <View style={styles.streakRow}>
            <Text style={styles.streakLabel}>Training streak</Text>
            <Text style={styles.streakVal}>{streak} days</Text>
          </View>

          {!hasPlan ? (
            <Text style={styles.mutedInline}>
              No active plan. Finish onboarding to see fuel and training for today.
            </Text>
          ) : (
            <>
              <Text style={styles.section}>Energy &amp; macros</Text>
              <MacroDashboard
                targets={macroTargets!}
                loggedKcal={logged.kcal}
                loggedProtein={logged.proteinG}
                loggedCarbs={logged.carbsG}
                loggedFat={logged.fatG}
              />

              <Text style={styles.section}>Recent activity</Text>
              {recentKeys.length === 0 ? (
                <Text style={styles.mutedInline}>
                  Complete meals or workouts to see history here.
                </Text>
              ) : (
                recentKeys.map((k) => {
                  const d = byDay[k]!;
                  const parts: string[] = [];
                  if (d.mealIds.length) parts.push(`${d.mealIds.length} meals`);
                  if (d.workoutDone) parts.push('workout');
                  return (
                    <View key={k} style={styles.activityRow}>
                      <Text style={styles.activityDate}>{k}</Text>
                      <Text style={styles.activityMeta}>
                        {parts.join(' · ') || '—'}
                      </Text>
                    </View>
                  );
                })
              )}

              <Text style={styles.section}>Today&apos;s plan</Text>
              <View style={styles.card}>
                <Text style={styles.cardKicker}>Workout</Text>
                {planDayIndex == null ? (
                  <Text style={styles.mutedCard}>
                    Today isn&apos;t covered by your current plan week. Check Train
                    after your week syncs.
                  </Text>
                ) : workout ? (
                  <>
                    <Text style={styles.cardTitle}>{workout.title}</Text>
                    <Text style={styles.cardMeta}>
                      {workout.exercises.length} movements
                    </Text>
                    <Pressable style={styles.rowBtn} onPress={onWorkoutToggle}>
                      <MaterialIcons
                        name={
                          completion.workoutDone
                            ? 'check-circle'
                            : 'radio-button-unchecked'
                        }
                        size={22}
                        color={theme.colors.gold}
                      />
                      <Text style={styles.rowBtnTxt}>
                        {completion.workoutDone
                          ? 'Completed'
                          : 'Mark workout done'}
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <Text style={styles.mutedCard}>
                    Rest or cardio — check Train tab.
                  </Text>
                )}
              </View>

              <View style={styles.card}>
                <Text style={styles.cardKicker}>Meals</Text>
                {planDayIndex == null ? (
                  <Text style={styles.mutedCard}>
                    Today isn&apos;t covered by your current plan week (plan starts{' '}
                    {weekStart}). Open Fuel after your week syncs.
                  </Text>
                ) : dayMeals.length === 0 ? (
                  <Text style={styles.mutedCard}>
                    No meals listed for today in your plan.
                  </Text>
                ) : (
                  dayMeals.map((m) => {
                    const done = completion.mealIds.includes(m.id);
                    return (
                      <Pressable
                        key={m.id}
                        style={styles.mealRow}
                        onPress={() => onMealToggle(m.id)}>
                        <MaterialIcons
                          name={done ? 'check-box' : 'check-box-outline-blank'}
                          size={22}
                          color={theme.colors.gold}
                        />
                        <View style={styles.mealText}>
                          <Text style={styles.mealName}>{m.name}</Text>
                          <Text style={styles.mealMeta}>
                            {m.macros.kcal} kcal · {m.macros.proteinG}g protein
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </View>

              <View style={styles.actions}>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => router.push('/grocery')}>
                  <MaterialIcons
                    name="shopping-cart"
                    size={20}
                    color={theme.colors.onGold}
                  />
                  <Text style={styles.actionTxt}>Grocery list</Text>
                </Pressable>
                <Pressable
                  style={styles.actionOutline}
                  onPress={() => router.push('/(tabs)/fuel')}>
                  <Text style={styles.actionOutlineTxt}>Open Fuel</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { paddingHorizontal: 0 },
  heroWrap: {
    height: HERO_H,
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroImg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroOp: {
    opacity: 0.85,
  },
  heroPlaceholder: {
    opacity: 1,
    backgroundColor: theme.colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGrad: {
    ...StyleSheet.absoluteFillObject,
  },
  heroTextBlock: {
    paddingHorizontal: 32,
    paddingBottom: 28,
    zIndex: 2,
  },
  heroKicker: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 3,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 48,
    lineHeight: 48,
    letterSpacing: -2,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  heroName: {
    fontFamily: theme.fonts.headline,
    fontStyle: 'italic',
    color: theme.colors.gold,
  },
  contentPull: {
    marginTop: -32,
    paddingHorizontal: 24,
    gap: 0,
    zIndex: 20,
  },
  wordCard: {
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 32,
    overflow: 'hidden',
    marginBottom: 20,
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
  wordRuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  wordRule: {
    width: 32,
    height: 4,
    backgroundColor: theme.colors.gold,
  },
  wordSectionLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 4,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  wordQuote: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 26,
    lineHeight: 32,
    color: theme.colors.onBackground,
    fontStyle: 'italic',
    marginBottom: 16,
    maxWidth: 640,
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
  btnOutline: {
    borderWidth: 1,
    borderColor: 'rgba(81,69,50,0.3)',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  btnOutlineTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  faithTeaser: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    padding: 16,
    marginBottom: 20,
  },
  faithTeaserText: { flex: 1, marginLeft: 12 },
  faithTeaserTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 14,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  faithTeaserSub: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 17,
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.outlineStrong,
    padding: 16,
    marginBottom: 20,
  },
  streakLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  streakVal: {
    fontFamily: theme.fonts.headline,
    fontSize: 28,
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
  card: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.outlineStrong,
    padding: 16,
    marginBottom: 16,
  },
  cardKicker: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  cardMeta: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
    marginBottom: 12,
  },
  rowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  rowBtnTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineStrong,
  },
  mealText: { flex: 1, marginLeft: 10 },
  mealName: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 15,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  mealMeta: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineStrong,
  },
  activityDate: {
    fontFamily: theme.fonts.label,
    fontSize: 13,
    color: theme.colors.onBackground,
  },
  activityMeta: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
  },
  mutedInline: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 16,
    lineHeight: 19,
  },
  mutedCard: {
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
  },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.gold,
    paddingVertical: 14,
  },
  actionTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.onGold,
    textTransform: 'uppercase',
  },
  actionOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  actionOutlineTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
});
