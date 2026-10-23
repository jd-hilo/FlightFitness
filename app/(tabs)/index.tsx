import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoachChatHeaderButton } from '@/components/CoachChatHeaderButton';
import { FrostedCard, SheenTile } from '@/components/FrostedCard';
import { ProgressRing } from '@/components/progress/TrendLine';
import { SunriseBackdrop } from '@/components/SunriseBackdrop';
import { theme } from '@/constants/theme';
import { paywallHref } from '@/lib/analytics';
import { pullProfileFirstNameIntoStore } from '@/lib/api/profileFirstName';
import { refreshRevenueCatCustomerInfo } from '@/lib/revenueCat';
import { getDailyFaithReading } from '@/lib/faithReadings';
import { formatDuration } from '@/lib/formatDuration';
import { formatRelativeDate } from '@/lib/insights/workoutInsights';
import { formatYmdLocal, viewWeekStartYmdLocal, weekDatesFromStart } from '@/lib/weekUtils';
import { useActiveWorkoutStore } from '@/stores/activeWorkoutStore';
import { useDailyContentStore } from '@/stores/dailyContentStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import {
  FREE_TIER_MAX_SAVED_WORKOUTS,
  hasEssentialsAccess,
  useSubscriptionStore,
} from '@/stores/subscriptionStore';
import { useWorkoutLibraryStore } from '@/stores/workoutLibraryStore';
import { useWorkoutSessionLogStore } from '@/stores/workoutSessionLogStore';

const RECENT_LIMIT = 4;
const HEADER_TOP = 16;
const TODAY_CARD_TOP = 206;
const MAX_SEGMENTS = 12;

const WEEKLY_GOAL_BY_OPTION: Record<string, number> = {
  one_two_sessions: 2,
  two_three_sessions: 3,
  four_sessions: 4,
  five_sessions: 5,
  six_sessions: 6,
};

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning,';
  if (hour < 18) return 'Good afternoon,';
  return 'Good evening,';
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const sessions = useWorkoutSessionLogStore((s) => s.sessions);
  const activeSession = useActiveWorkoutStore((s) => s.session);
  const workouts = useWorkoutLibraryStore((s) => s.workouts);
  const createWorkout = useWorkoutLibraryStore((s) => s.createWorkout);
  const firstName = useOnboardingStore((s) => s.answers.firstName.trim());
  const trainingDays = useOnboardingStore((s) => s.answers.trainingDaysPerWeek);
  const tier = useSubscriptionStore((s) => s.tier);

  useEffect(() => {
    void useDailyContentStore.getState().load();
    void pullProfileFirstNameIntoStore();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshRevenueCatCustomerInfo();
    }, [])
  );

  const reading = useMemo(() => getDailyFaithReading(), []);
  const weeklyGoal = WEEKLY_GOAL_BY_OPTION[trainingDays] ?? 3;
  const recent = sessions.slice(0, RECENT_LIMIT);

  const todayKey = formatYmdLocal(new Date());
  const weekDays = useMemo(() => {
    const trained = new Set(sessions.map((s) => s.dateKey));
    return weekDatesFromStart(viewWeekStartYmdLocal()).map((d) => {
      const key = formatYmdLocal(d);
      return {
        key,
        letter: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        done: trained.has(key),
        isToday: key === todayKey,
      };
    });
  }, [sessions, todayKey]);
  const weekCount = weekDays.filter((d) => d.done).length;

  const setProgress = useMemo(() => {
    if (!activeSession) return null;
    const rows = activeSession.exercises.flatMap((e) => e.setRows ?? []);
    if (rows.length === 0) return null;
    return {
      done: rows.filter((r) => r.completed).length,
      total: rows.length,
    };
  }, [activeSession]);

  const segments = useMemo(() => {
    if (setProgress) {
      const total = Math.min(setProgress.total, MAX_SEGMENTS);
      const filled = Math.round((setProgress.done / setProgress.total) * total);
      return { total, filled };
    }
    return { total: weeklyGoal, filled: Math.min(weekCount, weeklyGoal) };
  }, [setProgress, weeklyGoal, weekCount]);

  const hasWorkouts = workouts.length > 0;
  const todayTitle = activeSession
    ? activeSession.title
    : hasWorkouts
      ? 'Pick your workout'
      : 'Create your first workout';
  const todayMeta = activeSession
    ? `In progress · ${activeSession.exercises.length} ${
        activeSession.exercises.length === 1 ? 'exercise' : 'exercises'
      }`
    : hasWorkouts
      ? `${workouts.length} saved · Tap to choose`
      : 'Build it once, train all week';

  const onCreateWorkout = () => {
    const id = createWorkout('New workout');
    if (!id) {
      Alert.alert(
        'Workout limit reached',
        `Free includes up to ${FREE_TIER_MAX_SAVED_WORKOUTS} saved workouts. Upgrade to Essentials for unlimited workouts.`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push(paywallHref('train_gate')) },
        ]
      );
      return;
    }
    router.push(`/workout/${id}`);
  };

  const onTodayPress = () => {
    if (activeSession) {
      router.push('/workout-session');
      return;
    }
    if (!hasWorkouts) {
      onCreateWorkout();
      return;
    }
    router.push('/(tabs)/train');
  };

  const quickActions: {
    key: string;
    label: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    onPress: () => void;
  }[] = [
    {
      key: 'workouts',
      label: 'Start\nWorkout',
      icon: 'fitness-center',
      onPress: () => router.push('/(tabs)/train'),
    },
    {
      key: 'devotional',
      label: 'Daily\nDevotional',
      icon: 'menu-book',
      onPress: () => router.push('/(tabs)/faith'),
    },
    {
      key: 'progress',
      label: 'View\nProgress',
      icon: 'insights',
      onPress: () => router.push('/(tabs)/elite'),
    },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}>
        <SunriseBackdrop
          height={insets.top + TODAY_CARD_TOP + 120}
          horizonY={insets.top + TODAY_CARD_TOP - 14}
          topScrim={insets.top + 150}
        />

        <View style={[styles.content, { paddingTop: insets.top + HEADER_TOP }]}>
          <View style={styles.hero}>
            <View style={styles.greetRow}>
              <View style={styles.greetText}>
                <Text style={styles.greeting}>{greetingForHour(new Date().getHours())}</Text>
                <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
                  {firstName || 'Welcome back'}
                </Text>
              </View>
              <View style={styles.headerActions}>
                {tier === 'coaching' ? (
                  <CoachChatHeaderButton />
                ) : hasEssentialsAccess(tier) ? null : (
                  <Pressable
                    style={({ pressed }) => [styles.upgradeBtn, pressed && styles.pressed]}
                    onPress={() => router.push(paywallHref('home'))}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Upgrade your plan">
                    <LinearGradient
                      colors={['#F8F1E0', '#EBD5AE', '#C4A46C', '#EFE2C4']}
                      locations={[0, 0.32, 0.72, 1]}
                      start={{ x: 0.15, y: 0 }}
                      end={{ x: 0.85, y: 1 }}
                      style={styles.upgradeMetal}>
                      <LinearGradient
                        colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 0.55 }}
                        style={styles.upgradeSheen}
                      />
                      <Text style={styles.upgradeBtnTxt}>Upgrade</Text>
                    </LinearGradient>
                  </Pressable>
                )}
              </View>
            </View>
            <Text style={styles.tagline}>
              Stronger body. Deeper faith.{'\n'}Same mission.
            </Text>
          </View>

          <Pressable
            onPress={onTodayPress}
            style={({ pressed }) => pressed && styles.pressed}
            accessibilityRole="button"
            accessibilityLabel={`${todayTitle}. ${todayMeta}`}>
            <FrostedCard style={styles.todayCard} intensity={22} glow>
              <Text style={styles.kicker}>{activeSession ? 'Resume' : 'Today'}</Text>
              <View style={styles.todayRow}>
                <View style={styles.todayText}>
                  <Text
                    style={styles.todayTitle}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}>
                    {todayTitle}
                  </Text>
                  <Text style={styles.todayMeta} numberOfLines={1}>
                    {todayMeta}
                  </Text>
                </View>
                <LinearGradient
                  colors={['#F6EAD3', '#D8C29C']}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 0.8, y: 1 }}
                  style={styles.playBtn}>
                  <MaterialIcons
                    name={hasWorkouts || activeSession ? 'play-arrow' : 'add'}
                    size={30}
                    color={theme.colors.onChampagne}
                  />
                </LinearGradient>
              </View>
              <View style={styles.segments}>
                {Array.from({ length: segments.total }).map((_, i) => (
                  <View
                    key={i}
                    style={[styles.segment, i < segments.filled && styles.segmentFilled]}
                  />
                ))}
              </View>
            </FrostedCard>
          </Pressable>

          <Text style={styles.weekLabel}>
            This week · {weekCount} of {weeklyGoal}
          </Text>
          <View style={styles.weekRow}>
            {weekDays.map((d) => (
              <View
                key={d.key}
                style={[
                  styles.dayCircle,
                  d.done && styles.dayCircleDone,
                  d.isToday && styles.dayCircleToday,
                ]}>
                {d.done ? (
                  <MaterialIcons
                    name="check"
                    size={17}
                    color={d.isToday ? theme.colors.champagne : theme.colors.onBackground}
                  />
                ) : (
                  <Text style={[styles.dayLetter, d.isToday && styles.dayLetterToday]}>
                    {d.letter}
                  </Text>
                )}
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            {quickActions.map((a) => (
              <Pressable
                key={a.key}
                style={({ pressed }) => [styles.actionPress, pressed && styles.pressed]}
                onPress={a.onPress}
                accessibilityRole="button"
                accessibilityLabel={a.label.replace('\n', ' ')}>
                <SheenTile style={styles.actionTile}>
                  <MaterialIcons name={a.icon} size={26} color={theme.colors.champagne} />
                  <Text style={styles.actionLabel} numberOfLines={2}>
                    {a.label}
                  </Text>
                </SheenTile>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Current Focus</Text>
          <Pressable
            onPress={() => router.push('/(tabs)/faith')}
            style={({ pressed }) => pressed && styles.pressed}
            accessibilityRole="button"
            accessibilityLabel={`Current focus: ${reading.title}, ${reading.reference}. ${weekCount} of ${weeklyGoal} sessions this week`}>
            <SheenTile style={styles.focusCard}>
              <View style={styles.focusRing}>
                <ProgressRing
                  value={weekCount / weeklyGoal}
                  size={52}
                  stroke={4.5}
                  color={theme.colors.champagne}
                />
              </View>
              <View style={styles.focusText}>
                <Text style={styles.focusTitle} numberOfLines={1}>
                  {reading.title}
                </Text>
                <Text style={styles.focusMeta} numberOfLines={1}>
                  {reading.reference}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.55)" />
            </SheenTile>
          </Pressable>

          <Text style={styles.sectionTitle}>Recent</Text>
          {recent.length === 0 ? (
            <SheenTile style={styles.emptyCard}>
              <Text style={styles.muted}>Finished sessions will show up here.</Text>
            </SheenTile>
          ) : (
            recent.map((session) => (
              <SheenTile key={session.id} style={styles.sessionRow}>
                <View style={styles.sessionIcon}>
                  <MaterialIcons name="fitness-center" size={18} color={theme.colors.champagne} />
                </View>
                <View style={styles.sessionText}>
                  <Text style={styles.sessionTitle} numberOfLines={1}>
                    {session.title}
                  </Text>
                  <Text style={styles.sessionMeta} numberOfLines={1}>
                    {formatRelativeDate(session.dateKey)}
                  </Text>
                </View>
                <Text style={styles.sessionDuration}>{formatDuration(session.durationSec)}</Text>
              </SheenTile>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: 18 },
  pressed: { opacity: 0.85 },
  hero: { height: TODAY_CARD_TOP - HEADER_TOP },
  greetRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  greetText: { flex: 1, minWidth: 0 },
  greeting: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
  },
  name: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
    color: theme.colors.onBackground,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  upgradeBtn: {
    marginTop: 8,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#EBD5AE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  upgradeMetal: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,245,220,0.7)',
    overflow: 'hidden',
  },
  upgradeSheen: {
    ...StyleSheet.absoluteFillObject,
  },
  upgradeBtnTxt: {
    fontFamily: theme.fonts.labelBold,
    fontSize: 13,
    letterSpacing: 0.4,
    color: theme.colors.onChampagne,
  },
  tagline: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 15,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 10,
  },
  todayCard: {
    minHeight: 164,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderRadius: 22,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  kicker: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.72)',
    textTransform: 'uppercase',
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 10,
  },
  todayText: { flex: 1, minWidth: 0 },
  todayTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 21,
    letterSpacing: -0.3,
    color: theme.colors.onBackground,
  },
  todayMeta: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 6,
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segments: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 22,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  segmentFilled: { backgroundColor: theme.colors.champagne },
  weekLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    marginTop: 30,
    marginBottom: 14,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleDone: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
  },
  dayCircleToday: {
    borderWidth: 1.5,
    borderColor: theme.colors.champagne,
    backgroundColor: 'rgba(235,213,174,0.06)',
  },
  dayLetter: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  dayLetterToday: { color: theme.colors.onBackground },
  sectionTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    letterSpacing: -0.3,
    color: theme.colors.onBackground,
    marginTop: 30,
    marginBottom: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionPress: { flex: 1 },
  actionTile: {
    minHeight: 120,
    padding: 16,
    justifyContent: 'space-between',
  },
  actionLabel: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 19,
    color: theme.colors.onBackground,
  },
  focusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingLeft: 16,
    paddingRight: 12,
  },
  focusRing: { width: 52, height: 52 },
  focusText: { flex: 1, minWidth: 0 },
  focusTitle: {
    fontFamily: theme.fonts.label,
    fontSize: 16,
    color: theme.colors.onBackground,
    textTransform: 'capitalize',
  },
  focusMeta: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  emptyCard: { padding: 18 },
  muted: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.onSurfaceVariant,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 8,
  },
  sessionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.champagneSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionText: { flex: 1, minWidth: 0 },
  sessionTitle: {
    fontFamily: theme.fonts.label,
    fontSize: 15,
    color: theme.colors.onBackground,
  },
  sessionMeta: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginTop: 3,
  },
  sessionDuration: {
    fontFamily: theme.fonts.labelBold,
    fontSize: 15,
    color: theme.colors.onBackground,
  },
});
