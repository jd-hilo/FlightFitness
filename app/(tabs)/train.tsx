import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLoadingCross } from '@/components/AppLoadingCross';
import { CoachChatHeaderButton } from '@/components/CoachChatHeaderButton';
import { PlanStripEmptyHint } from '@/components/PlanStripEmptyHint';
import { PlanUpgradeBadge } from '@/components/PlanUpgradeBadge';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TabScreenHeading } from '@/components/TabScreenHeading';
import { WeekStrip } from '@/components/WeekStrip';
import { EditExerciseModal } from '@/components/plan/EditExerciseModal';
import { WorkoutBlock } from '@/components/plan/WorkoutBlock';
import { theme } from '@/constants/theme';
import {
  dateKeyForViewStripDay,
  isViewStripDayBeforeToday,
  mealDayIndexForViewStrip,
  viewStripIndexForToday,
  viewWeekStartYmdLocal,
} from '@/lib/weekUtils';
import { getTriggerVerse } from '@/lib/verses';
import {
  normalizeDay,
  useCompletionStore,
} from '@/stores/completionStore';
import { usePlanStore } from '@/stores/planStore';
import { usePlanWeekEnsureStore } from '@/stores/planWeekEnsureStore';
import { useUiStore } from '@/stores/uiStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useVerseModalStore } from '@/stores/verseModalStore';
export default function TrainScreen() {
  const insets = useSafeAreaInsets();
  const weekStart = usePlanStore((s) => s.weekStart);
  const workoutsByDay = usePlanStore((s) => s.workoutsByDay);
  const selectedPlanDay = useUiStore((s) => s.selectedPlanDay);
  const setSelectedPlanDay = useUiStore((s) => s.setSelectedPlanDay);
  const byDay = useCompletionStore((s) => s.byDay);
  const toggleWorkout = useCompletionStore((s) => s.toggleWorkout);
  const toggleExerciseDone = useCompletionStore((s) => s.toggleExerciseDone);
  const setWorkoutDoneFlag = useCompletionStore((s) => s.setWorkoutDoneFlag);
  const backfillExerciseIdsIfWorkoutDone = useCompletionStore(
    (s) => s.backfillExerciseIdsIfWorkoutDone
  );
  const updateExercise = usePlanStore((s) => s.updateExercise);
  const showVerse = useVerseModalStore((s) => s.show);
  const tier = useSubscriptionStore((s) => s.tier);
  const headerRight =
    tier === 'coaching' ? <CoachChatHeaderButton /> : <PlanUpgradeBadge />;
  const [exerciseEditIndex, setExerciseEditIndex] = useState<number | null>(null);
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

  const exerciseBeingEdited =
    exerciseEditIndex != null && workout?.exercises[exerciseEditIndex]
      ? workout.exercises[exerciseEditIndex]!
      : null;

  useEffect(() => {
    setSelectedPlanDay(viewStripIndexForToday(viewWeekStartYmdLocal()));
  }, [weekStart, setSelectedPlanDay]);

  useEffect(() => {
    setExerciseEditIndex(null);
  }, [selectedPlanDay, planWorkoutIndex]);

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

  return (
    <View style={styles.screen}>
      <ScreenHeader />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 120 },
        ]}>
        <TabScreenHeading title="Train" rightSlot={headerRight} />
        <WeekStrip
          weekStartYmd={viewWeekYmd}
          selectedIndex={selectedPlanDay}
          onSelect={setSelectedPlanDay}
        />
        {isPastDay ? (
          <Text style={styles.pastHint}>Past day — view only</Text>
        ) : null}
        {!hasPlanData ? (
          weekPlanEnsuring ? (
            <View style={styles.rest}>
              <View style={{ marginBottom: 16, alignItems: 'center' }}>
                <AppLoadingCross size="medium" />
              </View>
              <Text style={styles.restTitle}>Generating your week</Text>
              <Text style={styles.muted}>
                Syncing your plan for this calendar week…
              </Text>
            </View>
          ) : (
            <PlanStripEmptyHint variant="train" />
          )
        ) : planWorkoutIndex == null ? (
          <View style={styles.rest}>
            {weekPlanEnsuring ? (
              <>
                <View style={{ marginBottom: 16, alignItems: 'center' }}>
                <AppLoadingCross size="medium" />
              </View>
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
                  Choose another day to view or edit your saved workouts.
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
            onEditExercise={
              isPastDay
                ? undefined
                : (i) => {
                    setExerciseEditIndex(i);
                  }
            }
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
      <EditExerciseModal
        visible={exerciseEditIndex != null && exerciseBeingEdited != null}
        exercise={exerciseBeingEdited}
        onClose={() => setExerciseEditIndex(null)}
        onSave={(updated) => {
          const idx = mealDayIndexForViewStrip(
            weekStart!,
            viewWeekYmd,
            selectedPlanDay
          );
          if (idx != null && exerciseEditIndex != null) {
            updateExercise(idx, exerciseEditIndex, updated);
          }
          setExerciseEditIndex(null);
        }}
      />
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
