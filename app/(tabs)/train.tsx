import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoachChatHeaderButton } from '@/components/CoachChatHeaderButton';
import { PlanUpgradeBadge } from '@/components/PlanUpgradeBadge';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TabScreenHeading } from '@/components/TabScreenHeading';
import { theme } from '@/constants/theme';
import { paywallHref } from '@/lib/analytics';
import { formatDuration } from '@/lib/formatDuration';
import { ensureExerciseSetRows } from '@/lib/exerciseNormalize';
import {
  buildOverview,
  formatRelativeDate,
  formatVolume,
} from '@/lib/insights/workoutInsights';
import { useActiveWorkoutStore } from '@/stores/activeWorkoutStore';
import { useExerciseHistoryStore } from '@/stores/exerciseHistoryStore';
import { usePlanStore } from '@/stores/planStore';
import { useSubscriptionStore, hasEssentialsAccess, savedWorkoutLimit } from '@/stores/subscriptionStore';
import { useWorkoutLibraryStore } from '@/stores/workoutLibraryStore';
import { useWorkoutSessionLogStore } from '@/stores/workoutSessionLogStore';

export default function TrainScreen() {
  const insets = useSafeAreaInsets();
  const workouts = useWorkoutLibraryStore((s) => s.workouts);
  const createWorkout = useWorkoutLibraryStore((s) => s.createWorkout);
  const deleteWorkout = useWorkoutLibraryStore((s) => s.deleteWorkout);
  const importFromLegacyTemplates = useWorkoutLibraryStore((s) => s.importFromLegacyTemplates);
  const legacyTemplates = usePlanStore((s) => s.workoutTemplates);
  const session = useActiveWorkoutStore((s) => s.session);
  const startSession = useActiveWorkoutStore((s) => s.startSession);
  const getElapsedSeconds = useActiveWorkoutStore((s) => s.getElapsedSeconds);
  const allSessions = useWorkoutSessionLogStore((s) => s.sessions);
  const allHistory = useExerciseHistoryStore((s) => s.entries);
  const tier = useSubscriptionStore((s) => s.tier);
  const [timerTick, setTimerTick] = useState(0);

  const insightByWorkout = useMemo(() => {
    const map = new Map<
      string,
      { times: number; volumeLb: number; lastKey: string | null }
    >();
    for (const workout of workouts) {
      const sessions = allSessions.filter((s) => s.sourceWorkoutId === workout.id);
      const entries = allHistory.filter((e) => e.sourceWorkoutId === workout.id);
      const overview = buildOverview(sessions, entries);
      map.set(workout.id, {
        times: overview.timesPerformed,
        volumeLb: overview.totalVolumeLb,
        lastKey: overview.lastPerformedKey,
      });
    }
    return map;
  }, [workouts, allSessions, allHistory]);

  const headerRight =
    tier === 'coaching' ? <CoachChatHeaderButton /> : <PlanUpgradeBadge />;

  useEffect(() => {
    importFromLegacyTemplates(legacyTemplates);
  }, [importFromLegacyTemplates, legacyTemplates]);

  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => setTimerTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [session]);

  const elapsed = session ? getElapsedSeconds() : 0;
  void timerTick;

  const onCreateWorkout = () => {
    const id = createWorkout('New workout');
    if (!id) {
      Alert.alert(
        'Workout limit reached',
        'Free includes up to 3 saved workouts. Upgrade to Essentials for unlimited workouts.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push(paywallHref('train_gate')) },
        ]
      );
      return;
    }
    router.push(`/workout/${id}`);
  };

  const workoutLimit = savedWorkoutLimit(tier);

  const onBegin = (workoutId: string) => {
    const workout = workouts.find((w) => w.id === workoutId);
    if (!workout) return;
    if (workout.exercises.length === 0) {
      Alert.alert('Add exercises first', 'Open this workout and add at least one exercise.');
      router.push(`/workout/${workoutId}`);
      return;
    }
    if (session && session.sourceWorkoutId !== workoutId) {
      Alert.alert(
        'Workout in progress',
        'Finish or discard your current session before starting another.'
      );
      return;
    }
    if (!session) startSession(workout);
    router.push('/workout-session');
  };

  const onInsights = (workoutId: string) => {
    if (!hasEssentialsAccess(tier)) {
      router.push(paywallHref('insights_gate'));
      return;
    }
    router.push(`/workout-insights/${workoutId}`);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 120 },
        ]}>
        <TabScreenHeading title="Train" rightSlot={headerRight} />

        {session ? (
          <Pressable style={styles.resumeBanner} onPress={() => router.push('/workout-session')}>
            <View>
              <Text style={styles.resumeKicker}>Workout in progress</Text>
              <Text style={styles.resumeTitle}>{session.title}</Text>
            </View>
            <View style={styles.resumeRight}>
              <Text style={styles.resumeTimer}>{formatDuration(elapsed)}</Text>
              <Text style={styles.resumeLink}>Resume</Text>
            </View>
          </Pressable>
        ) : null}

        <Pressable style={styles.primaryBtn} onPress={onCreateWorkout}>
          <MaterialIcons name="add" size={20} color={theme.colors.onGold} />
          <Text style={styles.primaryBtnTxt}>Create workout</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>My workouts</Text>
        {workoutLimit != null ? (
          <Text style={styles.limitHint}>
            {workouts.length} of {workoutLimit} saved on Free
          </Text>
        ) : null}

        {workouts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No workouts yet</Text>
            <Text style={styles.muted}>
              Create a workout, add exercises with sets, then hit Begin when you are ready to train.
            </Text>
          </View>
        ) : (
          workouts.map((workout) => {
            const exerciseCount = workout.exercises.length;
            const setCount = workout.exercises.reduce(
              (acc, ex) => acc + (ensureExerciseSetRows(ex).setRows?.length ?? ex.sets),
              0
            );
            const noteCount = workout.exercises.reduce(
              (acc, ex) => acc + (ex.notes?.trim() ? 1 : 0),
              0
            );
            const insight = insightByWorkout.get(workout.id);
            const insightBits: string[] = [];
            if (insight && insight.times > 0) {
              insightBits.push(
                insight.times === 1 ? '1× done' : `${insight.times}× done`
              );
              if (insight.volumeLb > 0) {
                insightBits.push(formatVolume(insight.volumeLb));
              }
              if (insight.lastKey) {
                insightBits.push(formatRelativeDate(insight.lastKey));
              }
            }
            return (
              <View key={workout.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{workout.title}</Text>
                    <Text style={styles.cardMeta}>
                      {exerciseCount} exercise{exerciseCount === 1 ? '' : 's'} · {setCount}{' '}
                      sets
                      {noteCount > 0
                        ? ` · ${noteCount} note${noteCount === 1 ? '' : 's'}`
                        : ''}
                    </Text>
                    {insightBits.length > 0 ? (
                      <Text style={styles.cardInsight}>{insightBits.join(' · ')}</Text>
                    ) : null}
                  </View>
                  <Pressable
                    style={styles.beginBtn}
                    onPress={() => onBegin(workout.id)}>
                    <Text style={styles.beginBtnTxt}>Begin</Text>
                  </Pressable>
                </View>
                <View style={styles.cardActions}>
                  <Pressable onPress={() => router.push(`/workout/${workout.id}`)}>
                    <Text style={styles.cardLink}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={styles.cardLinkRow}
                    onPress={() => onInsights(workout.id)}>
                    <MaterialIcons
                      name="insights"
                      size={13}
                      color={theme.colors.gold}
                    />
                    <Text style={styles.cardLink}>Insights</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      Alert.alert('Delete workout?', workout.title, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => deleteWorkout(workout.id),
                        },
                      ])
                    }>
                    <Text style={styles.cardLinkDanger}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { paddingHorizontal: 24, paddingTop: 8 },
  resumeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 16,
    marginBottom: 16,
  },
  resumeKicker: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 1.5,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  resumeTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 16,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  resumeRight: { alignItems: 'flex-end' },
  resumeTimer: {
    fontFamily: theme.fonts.headline,
    fontSize: 22,
    color: theme.colors.gold,
  },
  resumeLink: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    color: theme.colors.gold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: theme.colors.gold,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  primaryBtnTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.onGold,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontFamily: theme.fonts.headline,
    fontSize: 24,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  limitHint: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: -10,
    marginBottom: 14,
  },
  empty: {
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerLow,
    gap: 8,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 16,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  muted: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 19,
  },
  card: {
    borderWidth: 1,
    borderColor: theme.colors.outlineStrong,
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 16,
    marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  cardMeta: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  cardInsight: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 0.4,
    color: theme.colors.gold,
    marginTop: 8,
  },
  beginBtn: {
    borderWidth: 1,
    borderColor: theme.colors.gold,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  beginBtnTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 1.5,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineStrong,
  },
  cardLink: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    color: theme.colors.gold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardLinkDanger: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    color: theme.colors.error,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
