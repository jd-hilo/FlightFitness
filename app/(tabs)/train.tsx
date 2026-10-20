import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeInOnFocus } from '@/components/FadeInOnFocus';
import { SheenTile } from '@/components/FrostedCard';
import { theme } from '@/constants/theme';
import { paywallHref } from '@/lib/analytics';
import { formatDuration } from '@/lib/formatDuration';
import { ensureExerciseSetRows } from '@/lib/exerciseNormalize';
import { buildOverview, formatRelativeDate, formatVolume } from '@/lib/insights/workoutInsights';
import { useActiveWorkoutStore } from '@/stores/activeWorkoutStore';
import { useExerciseHistoryStore } from '@/stores/exerciseHistoryStore';
import { usePlanStore } from '@/stores/planStore';
import {
  useSubscriptionStore,
  hasEssentialsAccess,
  savedWorkoutLimit,
} from '@/stores/subscriptionStore';
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
    const map = new Map<string, { times: number; volumeLb: number; lastKey: string | null }>();
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
      router.push(paywallHref('train_gate'));
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
        'Finish or discard your current session before starting another.',
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

  const onDelete = (workoutId: string, title: string) => {
    Alert.alert('Delete workout?', title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteWorkout(workoutId),
      },
    ]);
  };

  const onMore = (workoutId: string, title: string) => {
    Alert.alert(title, undefined, [
      { text: 'Edit workout', onPress: () => router.push(`/workout/${workoutId}`) },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(workoutId, title) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const sessionSets = useMemo(() => {
    if (!session) return null;
    const rows = session.exercises.flatMap((ex) => ensureExerciseSetRows(ex).setRows ?? []);
    return { done: rows.filter((r) => r.completed).length, total: rows.length };
  }, [session]);

  return (
    <FadeInOnFocus>
      <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.onBackground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Workouts</Text>
          <Text style={styles.titleSub} numberOfLines={1}>
            {workoutLimit == null
              ? `${workouts.length} saved`
              : workouts.length > workoutLimit
                ? `${workouts.length} saved`
                : `${workouts.length} of ${workoutLimit} saved`}
          </Text>
        </View>
        <Pressable
          onPress={onCreateWorkout}
          hitSlop={12}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Add workout">
          <MaterialIcons name="add" size={26} color={theme.colors.onBackground} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}>
        {session ? (
          <Pressable
            onPress={() => router.push('/workout-session')}
            style={({ pressed }) => pressed && styles.pressed}
            accessibilityRole="button"
            accessibilityLabel={`Resume ${session.title}`}>
            <SheenTile style={[styles.card, styles.resumeCard]}>
              <View style={styles.cardTop}>
                <View style={styles.cardText}>
                  <Text style={[styles.kicker, styles.kickerActive]} numberOfLines={1}>
                    In progress · {formatDuration(elapsed)}
                  </Text>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {session.title}
                  </Text>
                  {sessionSets ? (
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {sessionSets.done} of {sessionSets.total} sets done
                    </Text>
                  ) : null}
                </View>
                <View style={styles.playCircle}>
                  <MaterialIcons name="play-arrow" size={28} color={theme.colors.onChampagne} />
                </View>
              </View>
              {sessionSets && sessionSets.total > 0 ? (
                <View style={styles.segments}>
                  {Array.from({ length: Math.min(sessionSets.total, 12) }).map((_, i, arr) => (
                    <View
                      key={i}
                      style={[
                        styles.segment,
                        i < Math.round((sessionSets.done / sessionSets.total) * arr.length) &&
                          styles.segmentFilled,
                      ]}
                    />
                  ))}
                </View>
              ) : null}
            </SheenTile>
          </Pressable>
        ) : null}

        {workouts.length === 0 ? (
          <SheenTile style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <MaterialIcons name="fitness-center" size={26} color={theme.colors.champagne} />
            </View>
            <Text style={styles.emptyTitle}>Build your first workout</Text>
            <Text style={styles.muted}>
              Add exercises with sets and reps once, then tap play whenever you&apos;re ready to
              train.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              onPress={onCreateWorkout}
              accessibilityRole="button">
              <MaterialIcons name="add" size={20} color={theme.colors.onChampagne} />
              <Text style={styles.primaryBtnTxt}>Create workout</Text>
            </Pressable>
          </SheenTile>
        ) : (
          workouts.map((workout) => {
            const exercises = workout.exercises.map((ex) => ensureExerciseSetRows(ex));
            const setCount = exercises.reduce(
              (acc, ex) => acc + (ex.setRows?.length ?? ex.sets),
              0,
            );
            const estMinutes = Math.max(
              5,
              Math.round(
                exercises.reduce(
                  (acc, ex) => acc + (ex.setRows?.length ?? ex.sets) * (40 + ex.restSec),
                  0,
                ) / 60,
              ),
            );
            const insight = insightByWorkout.get(workout.id);
            const isActive = session?.sourceWorkoutId === workout.id;
            const kicker = isActive
              ? 'In progress'
              : insight?.lastKey
                ? `Last done ${formatRelativeDate(insight.lastKey)}`
                : 'Not started yet';
            const stats: string[] = [];
            if (insight && insight.times > 0) {
              stats.push(insight.times === 1 ? 'Done once' : `Done ${insight.times}×`);
              if (insight.volumeLb > 0) stats.push(`${formatVolume(insight.volumeLb)} lifted`);
            }
            const preview = exercises.slice(0, 3);
            const hiddenCount = exercises.length - preview.length;

            return (
              <Pressable
                key={workout.id}
                onPress={() => router.push(`/workout/${workout.id}`)}
                style={({ pressed }) => pressed && styles.pressed}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${workout.title}`}>
                <SheenTile style={[styles.card, isActive && styles.resumeCard]}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardText}>
                      <Text
                        style={[styles.kicker, isActive && styles.kickerActive]}
                        numberOfLines={1}>
                        {kicker}
                      </Text>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {workout.title}
                      </Text>
                      <Text style={styles.cardMeta} numberOfLines={1}>
                        {exercises.length === 0
                          ? 'No exercises yet'
                          : `${exercises.length} exercise${exercises.length === 1 ? '' : 's'} · ${setCount} sets · ~${estMinutes} min`}
                      </Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [styles.playCircle, pressed && styles.pressed]}
                      onPress={() => onBegin(workout.id)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={isActive ? 'Resume workout' : `Begin ${workout.title}`}>
                      <MaterialIcons
                        name={exercises.length === 0 ? 'add' : 'play-arrow'}
                        size={28}
                        color={theme.colors.onChampagne}
                      />
                    </Pressable>
                  </View>

                  {preview.length > 0 ? (
                    <View style={styles.preview}>
                      {preview.map((ex) => (
                        <View key={ex.id} style={styles.previewRow}>
                          <MaterialIcons
                            name="drag-handle"
                            size={18}
                            color="rgba(255,255,255,0.35)"
                          />
                          <Text style={styles.previewName} numberOfLines={1}>
                            {ex.name}
                          </Text>
                          <Text style={styles.previewSets} numberOfLines={1}>
                            {ex.setRows?.length ?? ex.sets} × {ex.reps}
                          </Text>
                        </View>
                      ))}
                      {hiddenCount > 0 ? (
                        <Text style={styles.previewMore}>
                          +{hiddenCount} more exercise{hiddenCount === 1 ? '' : 's'}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={styles.footer}>
                    <Text style={styles.stats} numberOfLines={1}>
                      {stats.join(' · ')}
                    </Text>
                    <Pressable
                      style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
                      onPress={() => onInsights(workout.id)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={`${workout.title} insights`}>
                      <MaterialIcons name="insights" size={18} color={theme.colors.onBackground} />
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
                      onPress={() => onMore(workout.id, workout.title)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={`${workout.title} options`}>
                      <MaterialIcons
                        name="more-horiz"
                        size={20}
                        color={theme.colors.onBackground}
                      />
                    </Pressable>
                  </View>
                </SheenTile>
              </Pressable>
            );
          })
        )}

        {workouts.length > 0 && workoutLimit != null ? (
          <Pressable
            style={({ pressed }) => [styles.upgradeBtn, pressed && styles.pressed]}
            onPress={() => router.push(paywallHref('train_gate'))}
            accessibilityRole="button"
            accessibilityLabel="Upgrade to add more workouts">
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
              <Text style={styles.upgradeBtnTxt} numberOfLines={1}>
                Upgrade to add more workouts
              </Text>
            </LinearGradient>
          </Pressable>
        ) : null}
      </ScrollView>
      </View>
    </FadeInOnFocus>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },
  pressed: { opacity: 0.85 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 14,
    gap: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 22,
    letterSpacing: -0.3,
    color: theme.colors.onBackground,
  },
  titleSub: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  card: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 10,
  },
  resumeCard: {
    borderColor: 'rgba(235,213,174,0.35)',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardText: { flex: 1, minWidth: 0 },
  kicker: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
  },
  kickerActive: { color: theme.colors.champagne },
  cardTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 21,
    letterSpacing: -0.3,
    color: theme.colors.onBackground,
    marginTop: 6,
  },
  cardMeta: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 4,
  },
  playCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.champagne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segments: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 16,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  segmentFilled: { backgroundColor: theme.colors.champagne },
  preview: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    gap: 10,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewName: {
    flex: 1,
    minWidth: 0,
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 15,
    color: theme.colors.onBackground,
  },
  previewSets: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },
  previewMore: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginLeft: 28,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  stats: {
    flex: 1,
    minWidth: 0,
    fontFamily: theme.fonts.label,
    fontSize: 13,
    color: theme.colors.champagne,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.champagneSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 19,
    color: theme.colors.onBackground,
    marginBottom: 6,
  },
  muted: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  primaryBtn: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.champagne,
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
  },
  primaryBtnTxt: {
    fontFamily: theme.fonts.labelBold,
    fontSize: 16,
    color: theme.colors.onChampagne,
  },
  upgradeBtn: {
    marginTop: 8,
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#EBD5AE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  upgradeMetal: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 26,
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
    fontSize: 15,
    letterSpacing: 0.2,
    color: theme.colors.onChampagne,
  },
});
