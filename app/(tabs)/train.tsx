import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { formatDuration } from '@/lib/formatDuration';
import { aiGenerateFullWeek } from '@/lib/planAiAssist';
import { ensureExerciseSetRows } from '@/lib/exerciseNormalize';
import { viewWeekStartYmdLocal } from '@/lib/weekUtils';
import { useActiveWorkoutStore } from '@/stores/activeWorkoutStore';
import { usePlanStore } from '@/stores/planStore';
import { useSubscriptionStore, shouldAllowAiFullWeekGeneration, savedWorkoutLimit } from '@/stores/subscriptionStore';
import { useWorkoutLibraryStore } from '@/stores/workoutLibraryStore';

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
  const tier = useSubscriptionStore((s) => s.tier);
  const canUseAi = shouldAllowAiFullWeekGeneration();
  const [aiBusy, setAiBusy] = useState(false);
  const [timerTick, setTimerTick] = useState(0);

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
          { text: 'Upgrade', onPress: () => router.push('/paywall') },
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

  const handleAiWeek = async () => {
    if (!canUseAi) {
      router.push('/paywall');
      return;
    }
    setAiBusy(true);
    try {
      const res = await aiGenerateFullWeek(viewWeekStartYmdLocal());
      if (!res.ok) Alert.alert('AI assist', res.error);
    } finally {
      setAiBusy(false);
    }
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
            return (
              <View key={workout.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{workout.title}</Text>
                    <Text style={styles.cardMeta}>
                      {exerciseCount} exercise{exerciseCount === 1 ? '' : 's'} · {setCount} sets
                    </Text>
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

        <Pressable style={styles.aiWeekBtn} disabled={aiBusy} onPress={() => void handleAiWeek()}>
          {aiBusy ? (
            <ActivityIndicator color={theme.colors.onSurfaceVariant} />
          ) : (
            <Text style={styles.aiWeekBtnTxt}>
              {canUseAi ? 'Generate full week plan (AI)' : 'Upgrade for AI week plans'}
            </Text>
          )}
        </Pressable>
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
  cardLinkDanger: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    color: theme.colors.error,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  aiWeekBtn: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  aiWeekBtnTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 1.5,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
});
