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

import { ScreenHeader } from '@/components/ScreenHeader';
import { TabScreenHeading } from '@/components/TabScreenHeading';
import { WeekStrip } from '@/components/WeekStrip';
import { WorkoutBlock } from '@/components/plan/WorkoutBlock';
import { theme } from '@/constants/theme';
import { generateWeekPlan } from '@/lib/api/plan';
import { dateKeyForPlanDay, planDayIndexForToday } from '@/lib/weekUtils';
import { getWeekPlanFromStore } from '@/lib/planFromStore';
import { getTriggerVerse } from '@/lib/verses';
import {
  normalizeDay,
  useCompletionStore,
} from '@/stores/completionStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { usePlanStore } from '@/stores/planStore';
import { useUiStore } from '@/stores/uiStore';
import { useVerseModalStore } from '@/stores/verseModalStore';
import { useCanCustomize, useCanGeneratePlan } from '@/stores/subscriptionStore';

export default function TrainScreen() {
  const insets = useSafeAreaInsets();
  const weekStart = usePlanStore((s) => s.weekStart);
  const workoutsByDay = usePlanStore((s) => s.workoutsByDay);
  const answers = useOnboardingStore((s) => s.answers);
  const selectedPlanDay = useUiStore((s) => s.selectedPlanDay);
  const setSelectedPlanDay = useUiStore((s) => s.setSelectedPlanDay);
  const byDay = useCompletionStore((s) => s.byDay);
  const toggleWorkout = useCompletionStore((s) => s.toggleWorkout);
  const toggleExerciseDone = useCompletionStore((s) => s.toggleExerciseDone);
  const setWorkoutDoneFlag = useCompletionStore((s) => s.setWorkoutDoneFlag);
  const backfillExerciseIdsIfWorkoutDone = useCompletionStore(
    (s) => s.backfillExerciseIdsIfWorkoutDone
  );
  const setFromWeekPlan = usePlanStore((s) => s.setFromWeekPlan);
  const showVerse = useVerseModalStore((s) => s.show);
  const canCustomize = useCanCustomize();
  const canGen = useCanGeneratePlan();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (weekStart) setSelectedPlanDay(planDayIndexForToday(weekStart));
  }, [weekStart, setSelectedPlanDay]);

  useEffect(() => {
    if (!weekStart || !workoutsByDay) return;
    const w = workoutsByDay[selectedPlanDay];
    if (!w) return;
    const dk = dateKeyForPlanDay(weekStart, selectedPlanDay);
    backfillExerciseIdsIfWorkoutDone(
      dk,
      w.exercises.map((e) => e.id)
    );
  }, [weekStart, workoutsByDay, selectedPlanDay, backfillExerciseIdsIfWorkoutDone]);

  if (!weekStart || !workoutsByDay) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>No plan loaded.</Text>
      </View>
    );
  }

  const dateKey = dateKeyForPlanDay(weekStart, selectedPlanDay);
  const workout = workoutsByDay[selectedPlanDay];
  const completion = normalizeDay(byDay[dateKey]);

  const onToggleWorkout = () => {
    const ids = workout?.exercises.map((e) => e.id) ?? [];
    const nowDone = toggleWorkout(dateKey, ids);
    if (nowDone) {
      const v = getTriggerVerse('discipline', `${dateKey}-w-train`);
      showVerse(v, 'Whatever you do, work at it with all your heart.');
    }
  };

  const onToggleExercise = (exerciseId: string) => {
    if (!workout) return;
    const before = normalizeDay(useCompletionStore.getState().byDay[dateKey]);
    toggleExerciseDone(dateKey, exerciseId);
    const after = normalizeDay(useCompletionStore.getState().byDay[dateKey]);
    const allIds = workout.exercises.map((e) => e.id);
    const allDone =
      allIds.length > 0 && allIds.every((id) => after.exerciseIdsDone.includes(id));
    if (allDone && !before.workoutDone) {
      setWorkoutDoneFlag(dateKey, true);
      const v = getTriggerVerse('discipline', `${dateKey}-ex-${exerciseId}`);
      showVerse(v, 'Whatever you do, work at it with all your heart.');
    } else if (!allDone && before.workoutDone) {
      setWorkoutDoneFlag(dateKey, false);
    }
  };

  const onSwapExercise = async (exerciseIndex: number) => {
    if (!canCustomize) {
      router.push('/paywall');
      return;
    }
    if (!canGen) {
      Alert.alert('Upgrade required', 'Unlock unlimited AI to swap exercises.');
      return;
    }
    const current = getWeekPlanFromStore();
    if (!current) return;
    setBusy(true);
    const res = await generateWeekPlan({
      onboarding: answers,
      action: 'swapExercise',
      swapExercise: { dayIndex: selectedPlanDay, exerciseIndex },
      currentPlan: current,
    });
    setBusy(false);
    if (res.ok) setFromWeekPlan(res.plan);
    else Alert.alert('Could not swap', res.error);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 120 },
        ]}>
        <TabScreenHeading title="Train" />
        <WeekStrip
          weekStartYmd={weekStart}
          selectedIndex={selectedPlanDay}
          onSelect={setSelectedPlanDay}
        />
        {busy ? (
          <ActivityIndicator color={theme.colors.gold} style={{ marginVertical: 24 }} />
        ) : null}
        {workout ? (
          <WorkoutBlock
            workout={workout}
            completed={completion.workoutDone}
            exerciseIdsDone={completion.exerciseIdsDone}
            onToggleComplete={onToggleWorkout}
            onToggleExercise={onToggleExercise}
            onSwapExercise={onSwapExercise}
          />
        ) : (
          <View style={styles.rest}>
            <Text style={styles.restTitle}>Recovery day</Text>
            <Text style={styles.muted}>
              Light walk or mobility — your split builds in rest too.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { paddingHorizontal: 24, paddingTop: 8 },
  rest: {
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  restTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  muted: {
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
  },
});
