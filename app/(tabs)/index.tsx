import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoachChatHeaderButton } from '@/components/CoachChatHeaderButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { glassCard, glassChip, theme } from '@/constants/theme';
import { formatDuration } from '@/lib/formatDuration';
import { formatRelativeDate } from '@/lib/insights/workoutInsights';
import { getDailyVerse } from '@/lib/verses';
import {
  formatYmdLocal,
  viewWeekStartYmdLocal,
  weekDatesFromStart,
} from '@/lib/weekUtils';
import { useActiveWorkoutStore } from '@/stores/activeWorkoutStore';
import { useCompletionStore } from '@/stores/completionStore';
import { useDailyContentStore } from '@/stores/dailyContentStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useWorkoutLibraryStore } from '@/stores/workoutLibraryStore';
import { useWorkoutSessionLogStore } from '@/stores/workoutSessionLogStore';

const RECENT_LIMIT = 6;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const dailyRemote = useDailyContentStore((s) => s.content);
  const streak = useCompletionStore((s) => s.streak);
  const sessions = useWorkoutSessionLogStore((s) => s.sessions);
  const activeSession = useActiveWorkoutStore((s) => s.session);
  const startSession = useActiveWorkoutStore((s) => s.startSession);
  const workouts = useWorkoutLibraryStore((s) => s.workouts);
  const tier = useSubscriptionStore((s) => s.tier);

  useEffect(() => {
    void useDailyContentStore.getState().load();
  }, []);

  const verse = useMemo(
    () => dailyRemote?.verse ?? getDailyVerse(),
    [dailyRemote]
  );

  const recent = sessions.slice(0, RECENT_LIMIT);

  const todayKey = formatYmdLocal(new Date());
  const weekDays = useMemo(() => {
    const trained = new Set(sessions.map((s) => s.dateKey));
    return weekDatesFromStart(viewWeekStartYmdLocal()).map((d) => {
      const key = formatYmdLocal(d);
      return {
        key,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        done: trained.has(key),
        isToday: key === todayKey,
      };
    });
  }, [sessions, todayKey]);
  const weekCount = weekDays.filter((d) => d.done).length;
  const nextWorkout = activeSession
    ? activeSession.title
    : workouts.length === 1
      ? workouts[0]?.title
      : undefined;

  const onStudyScripture = () => {
    router.push('/(tabs)/faith');
  };

  const onCompleteWorkout = () => {
    if (activeSession) {
      router.push('/workout-session');
      return;
    }

    if (workouts.length === 1) {
      const workout = workouts[0];
      if (!workout) {
        router.push('/(tabs)/train');
        return;
      }
      if (workout.exercises.length === 0) {
        Alert.alert(
          'Add exercises first',
          'Open this workout and add at least one exercise.'
        );
        router.push(`/workout/${workout.id}`);
        return;
      }
      startSession(workout);
      router.push('/workout-session');
      return;
    }

    router.push('/(tabs)/train');
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        rightSlot={tier === 'coaching' ? <CoachChatHeaderButton /> : undefined}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Today</Text>

        <View style={styles.weekRow}>
          {weekDays.map((d) => (
            <View key={d.key} style={[styles.dayCol, d.isToday && styles.dayColToday]}>
              <Text style={[styles.dayLabel, d.isToday && styles.dayLabelToday]}>
                {d.label}
              </Text>
              <View style={[styles.dayCheck, d.done && styles.dayCheckDone]}>
                {d.done ? (
                  <MaterialIcons name="check" size={14} color={theme.colors.onGold} />
                ) : null}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroChip}>
            <MaterialIcons
              name={activeSession ? 'play-arrow' : 'fitness-center'}
              size={14}
              color={theme.colors.gold}
            />
            <Text style={styles.heroChipTxt}>
              {activeSession ? 'In progress' : 'Training'}
            </Text>
          </View>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {nextWorkout ?? 'Pick your workout'}
          </Text>
          <Text style={styles.heroMeta}>
            {activeSession
              ? 'Pick up where you left off.'
              : 'Show up today. Strength and scripture, one session at a time.'}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.primaryPill, pressed && styles.pressed]}
            onPress={onCompleteWorkout}
            accessibilityRole="button"
            accessibilityLabel={activeSession ? 'Resume workout' : 'Start workout'}>
            <Text style={styles.primaryPillTxt}>
              {activeSession ? 'Resume workout' : 'Start workout'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statTile}>
            <Text style={styles.statLabel}>Streak</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{streak}</Text>
              <Text style={styles.statUnit}>{streak === 1 ? 'day' : 'days'}</Text>
            </View>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statLabel}>This week</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{weekCount}</Text>
              <Text style={styles.statUnit}>
                {weekCount === 1 ? 'session' : 'sessions'}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.verseCard, pressed && styles.pressed]}
          onPress={onStudyScripture}
          accessibilityRole="button"
          accessibilityLabel="Study scripture">
          <View style={styles.verseHead}>
            <View style={styles.iconChip}>
              <MaterialIcons name="menu-book" size={16} color={theme.colors.gold} />
            </View>
            <Text style={styles.kicker}>Verse of the day</Text>
            <MaterialIcons
              name="chevron-right"
              size={22}
              color={theme.colors.onSurfaceVariant}
            />
          </View>
          <Text style={styles.verseText}>{verse.text}</Text>
          <Text style={styles.reference}>{verse.reference}</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Recent</Text>
        <View style={styles.listCard}>
          {recent.length === 0 ? (
            <Text style={styles.muted}>Finished sessions will show up here.</Text>
          ) : (
            recent.map((session, i) => (
              <View
                key={session.id}
                style={[styles.sessionRow, i > 0 && styles.sessionRowDivider]}>
                <View style={styles.sessionText}>
                  <Text style={styles.sessionTitle} numberOfLines={1}>
                    {session.title}
                  </Text>
                  <Text style={styles.sessionMeta}>
                    {formatRelativeDate(session.dateKey)}
                  </Text>
                </View>
                <Text style={styles.sessionDuration}>
                  {formatDuration(session.durationSec)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  pageTitle: {
    fontFamily: theme.fonts.headline,
    fontSize: 34,
    letterSpacing: -1,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dayCol: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    width: 44,
    borderRadius: theme.radii.full,
  },
  dayColToday: {
    ...glassChip,
  },
  dayLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  dayLabelToday: { color: theme.colors.onBackground },
  dayCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.outlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCheckDone: {
    backgroundColor: theme.colors.gold,
    borderColor: theme.colors.gold,
  },
  heroCard: {
    ...glassCard,
    padding: 20,
    marginBottom: 12,
  },
  heroChip: {
    ...glassChip,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  heroChipTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    color: theme.colors.onBackground,
  },
  heroTitle: {
    fontFamily: theme.fonts.headline,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.8,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  heroMeta: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.onSurfaceVariant,
    marginTop: 8,
    marginBottom: 20,
  },
  primaryPill: {
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radii.full,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryPillTxt: {
    fontFamily: theme.fonts.labelBold,
    fontSize: 16,
    color: theme.colors.onGold,
  },
  pressed: { opacity: 0.85 },
  statRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statTile: {
    ...glassCard,
    flex: 1,
    padding: 16,
  },
  statLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statValue: {
    fontFamily: theme.fonts.headline,
    fontSize: 34,
    letterSpacing: -1,
    color: theme.colors.onBackground,
  },
  statUnit: {
    fontFamily: theme.fonts.label,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  verseCard: {
    ...glassCard,
    padding: 20,
    marginBottom: 28,
  },
  verseHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  iconChip: {
    ...glassChip,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    flex: 1,
    fontFamily: theme.fonts.label,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
  },
  verseText: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 18,
    lineHeight: 27,
    color: theme.colors.onBackground,
  },
  reference: {
    fontFamily: theme.fonts.labelBold,
    fontSize: 14,
    color: theme.colors.gold,
    marginTop: 12,
  },
  sectionTitle: {
    fontFamily: theme.fonts.headline,
    fontSize: 20,
    letterSpacing: -0.4,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  listCard: {
    ...glassCard,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  muted: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.onSurfaceVariant,
    paddingVertical: 14,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  sessionRowDivider: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  sessionText: { flex: 1, minWidth: 0 },
  sessionTitle: {
    fontFamily: theme.fonts.labelBold,
    fontSize: 16,
    color: theme.colors.onBackground,
  },
  sessionMeta: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginTop: 3,
  },
  sessionDuration: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 16,
    color: theme.colors.onBackground,
  },
});
