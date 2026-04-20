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
import { WeekStrip } from '@/components/WeekStrip';
import { WorkoutBlock } from '@/components/plan/WorkoutBlock';
import { theme } from '@/constants/theme';
import { generateWeekPlan } from '@/lib/api/plan';
import {
  dateKeyForViewStripDay,
  isViewStripDayBeforeToday,
  mealDayIndexForViewStrip,
  viewStripIndexForToday,
  viewWeekStartYmdLocal,
} from '@/lib/weekUtils';
import { getWeekPlanFromStore } from '@/lib/planFromStore';
import { getTriggerVerse } from '@/lib/verses';
import {
  normalizeDay,
  useCompletionStore,
} from '@/stores/completionStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { usePlanStore } from '@/stores/planStore';
import { usePlanWeekEnsureStore } from '@/stores/planWeekEnsureStore';
import { useUiStore } from '@/stores/uiStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useVerseModalStore } from '@/stores/verseModalStore';
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
  const tier = useSubscriptionStore((s) => s.tier);
  const headerRight =
    tier === 'coaching' ? <CoachChatHeaderButton /> : <PlanUpgradeBadge />;
  const [busy, setBusy] = useState(false);
  const weekPlanEnsuring = usePlanWeekEnsureStore((s) => s.inProgress);

  const viewWeekYmd = viewWeekStartYmdLocal();
  const isPastDay = isViewStripDayBeforeToday(viewWeekYmd, selectedPlanDay);
  const hasPlanData = weekStart != null && workoutsByDay != null;
  const planWorkoutIndex =
    hasPlanData && weekStart
      ? mealDayIndexForViewStrip(weekStart, viewWeekYmd, selectedPlanDay)
      : null;
  const dateKey = hasPlanData
    ? dateKeyForViewStripDay(viewWeekYmd, selectedPlanDay)
    : '';
  const workout =
    hasPlanData && planWorkoutIndex != null
      ? workoutsByDay![planWorkoutIndex]
      : null;
  const completion = normalizeDay(byDay[dateKey]);

  useEffect(() => {
    if (!weekStart) return;
    setSelectedPlanDay(viewStripIndexForToday(viewWeekStartYmdLocal()));
  }, [weekStart, setSelectedPlanDay]);

  useEffect(() => {
    if (!weekStart || !workoutsByDay) return;
    const idx = mealDayIndexForViewStrip(weekStart, viewWeekYmd, selectedPlanDay);
    if (idx == null) return;
    const w = workoutsByDay[idx];
    if (!w) return;
    const dk = dateKeyForViewStripDay(viewWeekYmd, selectedPlanDay);
    backfillExerciseIdsIfWorkoutDone(
      dk,
      w.exercises.map((e) => e.id)
    );
  }, [
    weekStart,
    workoutsByDay,
    selectedPlanDay,
    viewWeekYmd,
    backfillExerciseIdsIfWorkoutDone,
  ]);

  if (!hasPlanData) {
    return (
      <View style={styles.screen}>
        <ScreenHeader rightSlot={headerRight} />
        {weekPlanEnsuring ? (
          <View style={styles.generatingBox}>
            <ActivityIndicator color={theme.colors.gold} />
            <Text style={styles.generatingTitle}>Generating your week</Text>
            <Text style={styles.muted}>
              Syncing your plan for this calendar week…
            </Text>
          </View>
        ) : (
          <View style={styles.generatingBox}>
            <Text style={styles.muted}>No plan loaded.</Text>
          </View>
        )}
      </View>
    );
  }

  const onToggleWorkout = () => {
    if (isPastDay) return;
    const ids = workout?.exercises.map((e) => e.id) ?? [];
    const nowDone = toggleWorkout(dateKey, ids);
    if (nowDone) {
      const v = getTriggerVerse('discipline', `${dateKey}-w-train`);
      showVerse(v, 'Whatever you do, work at it with all your heart.');
    }
  };

  const onToggleExercise = (exerciseId: string) => {
    if (isPastDay || !workout) return;
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
    if (isPastDay) return;
    const idx = mealDayIndexForViewStrip(
      weekStart,
      viewWeekYmd,
      selectedPlanDay
    );
    if (idx == null) {
      Alert.alert(
        'Outside plan week',
        'This calendar day is not in your current 7-day plan.'
      );
      return;
    }
    const current = getWeekPlanFromStore();
    if (!current) return;
    setBusy(true);
    const res = await generateWeekPlan({
      onboarding: answers,
      action: 'swapExercise',
      swapExercise: { dayIndex: idx, exerciseIndex },
      currentPlan: current,
    });
    setBusy(false);
    if (res.ok) setFromWeekPlan(res.plan);
    else Alert.alert('Could not swap', res.error);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader rightSlot={headerRight} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 120 },
        ]}>
        <TabScreenHeading title="Train" />
        <WeekStrip
          weekStartYmd={viewWeekYmd}
          selectedIndex={selectedPlanDay}
          onSelect={setSelectedPlanDay}
        />
        {isPastDay ? (
          <Text style={styles.pastHint}>Past day — view only</Text>
        ) : null}
        {busy ? (
          <ActivityIndicator color={theme.colors.gold} style={{ marginVertical: 24 }} />
        ) : null}
        {planWorkoutIndex == null ? (
          <View style={styles.rest}>
            {weekPlanEnsuring ? (
              <>
                <ActivityIndicator color={theme.colors.gold} style={{ marginBottom: 16 }} />
                <Text style={styles.restTitle}>Generating your week</Text>
                <Text style={styles.muted}>
                  Building your plan for this calendar week…
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.restTitle}>Outside plan week</Text>
                <Text style={styles.muted}>
                  This date is not covered by your saved plan (plan starts {weekStart}).
                  Regenerate a full week or choose another day.
                </Text>
              </>
            )}
          </View>
        ) : workout ? (
          <WorkoutBlock
            workout={workout}
            completed={completion.workoutDone}
            exerciseIdsDone={completion.exerciseIdsDone}
            onToggleComplete={onToggleWorkout}
            onToggleExercise={onToggleExercise}
            onSwapExercise={onSwapExercise}
            readOnly={isPastDay}
          />
        ) : (
          <View style={[styles.rest, isPastDay && styles.restReadOnly]}>
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
  generatingBox: {
    padding: 24,
    gap: 12,
    alignItems: 'flex-start',
  },
  generatingTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
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
  pastHint: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  restReadOnly: {
    opacity: 0.55,
  },
});
