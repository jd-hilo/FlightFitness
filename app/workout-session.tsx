import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NumberStepper } from '@/components/plan/NumberStepper';
import { ExerciseIcon } from '@/components/plan/ExerciseIcon';
import { RestTimerOverlay } from '@/components/workout/RestTimerOverlay';
import { theme } from '@/constants/theme';
import { formatDuration } from '@/lib/formatDuration';
import { ensureExerciseSetRows } from '@/lib/exerciseNormalize';
import { parseTargetReps } from '@/lib/repUtils';
import { getTriggerVerse } from '@/lib/verses';
import { useActiveWorkoutStore } from '@/stores/activeWorkoutStore';
import { useVerseModalStore } from '@/stores/verseModalStore';
import { useWorkoutLibraryStore } from '@/stores/workoutLibraryStore';
import { useWorkoutSessionLogStore } from '@/stores/workoutSessionLogStore';
import type { Exercise } from '@/types/plan';

type Focus = { exerciseIndex: number; setRowIndex: number };

type RestState = {
  seconds: number;
  verseKey: string;
  nextLabel: string;
  nextFocus: Focus | null;
};

function findNextIncompleteSet(
  exercises: Exercise[],
  afterExerciseIndex: number,
  afterSetRowIndex: number
): Focus | null {
  const normalized = exercises.map(ensureExerciseSetRows);
  const currentRows = normalized[afterExerciseIndex]?.setRows ?? [];
  for (let rowIndex = afterSetRowIndex + 1; rowIndex < currentRows.length; rowIndex++) {
    if (!currentRows[rowIndex]?.completed) {
      return { exerciseIndex: afterExerciseIndex, setRowIndex: rowIndex };
    }
  }
  for (let exerciseIndex = afterExerciseIndex + 1; exerciseIndex < normalized.length; exerciseIndex++) {
    const rows = normalized[exerciseIndex]?.setRows ?? [];
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      if (!rows[rowIndex]?.completed) {
        return { exerciseIndex, setRowIndex: rowIndex };
      }
    }
  }
  return null;
}

function findFirstIncompleteSet(exercises: Exercise[]): Focus | null {
  return findNextIncompleteSet(exercises, -1, -1);
}

function focusLabel(exercises: Exercise[], focus: Focus | null): string {
  if (!focus) return 'All sets complete';
  const ex = ensureExerciseSetRows(exercises[focus.exerciseIndex]!);
  return `Next: ${ex.name} · Set ${focus.setRowIndex + 1}`;
}

export default function WorkoutSessionScreen() {
  const insets = useSafeAreaInsets();
  const session = useActiveWorkoutStore((s) => s.session);
  const finishSession = useActiveWorkoutStore((s) => s.finishSession);
  const cancelSession = useActiveWorkoutStore((s) => s.cancelSession);
  const pauseSession = useActiveWorkoutStore((s) => s.pauseSession);
  const resumeSession = useActiveWorkoutStore((s) => s.resumeSession);
  const toggleSetComplete = useActiveWorkoutStore((s) => s.toggleSetComplete);
  const completeSetRow = useActiveWorkoutStore((s) => s.completeSetRow);
  const updateSetRow = useActiveWorkoutStore((s) => s.updateSetRow);
  const getElapsedSeconds = useActiveWorkoutStore((s) => s.getElapsedSeconds);
  const applySessionProgress = useWorkoutLibraryStore((s) => s.applySessionProgress);
  const showVerse = useVerseModalStore((s) => s.show);
  const [elapsed, setElapsed] = useState(0);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [rest, setRest] = useState<RestState | null>(null);

  useEffect(() => {
    if (!session) {
      router.replace('/(tabs)/train');
      return;
    }
    setFocus(findFirstIncompleteSet(session.exercises));
    const tick = () => setElapsed(getElapsedSeconds());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session?.sessionId, getElapsedSeconds]);

  const endRest = useCallback(() => {
    setRest((current) => {
      if (current?.nextFocus) setFocus(current.nextFocus);
      return null;
    });
  }, []);

  const handleSetPress = (exerciseIndex: number, setRowIndex: number, completed: boolean) => {
    if (!session) return;
    if (completed) {
      toggleSetComplete(exerciseIndex, setRowIndex);
      return;
    }

    const exercise = ensureExerciseSetRows(session.exercises[exerciseIndex]!);
    const row = exercise.setRows?.[setRowIndex];
    completeSetRow(exerciseIndex, setRowIndex);

    const updated = useActiveWorkoutStore.getState().session;
    if (!updated) return;
    const nextFocus = findNextIncompleteSet(updated.exercises, exerciseIndex, setRowIndex);
    const restSec = row?.restSec ?? exercise.restSec ?? 90;
    const verseKey = `${session.sessionId}:${exerciseIndex}:${setRowIndex}`;

    if (nextFocus) {
      setRest({
        seconds: restSec,
        verseKey,
        nextLabel: focusLabel(updated.exercises, nextFocus),
        nextFocus,
      });
    } else {
      setFocus(null);
    }
  };

  const finishAndExit = (saveProgress: boolean) => {
    if (!session) return;
    const durationSec = getElapsedSeconds();
    if (saveProgress) {
      applySessionProgress(session.sourceWorkoutId, session.exercises);
    }
    useWorkoutSessionLogStore.getState().logCompletedSession({
      title: session.title,
      sourceWorkoutId: session.sourceWorkoutId,
      durationSec,
    });
    finishSession();
    const v = getTriggerVerse('discipline', session.sessionId);
    showVerse(v, 'Whatever you do, work at it with all your heart.');
    router.replace('/(tabs)/train');
  };

  const onFinish = () => {
    Alert.alert(
      'Finish workout?',
      `${formatDuration(elapsed)} logged. Save your weights and reps to this workout for next time?`,
      [
        { text: 'Keep going', style: 'cancel' },
        {
          text: 'Finish without saving',
          onPress: () => finishAndExit(false),
        },
        {
          text: 'Save & finish',
          style: 'default',
          onPress: () => finishAndExit(true),
        },
      ]
    );
  };

  if (!session) return null;

  const paused = session.pausedAt != null;
  const completedSets = session.exercises.reduce((acc, ex) => {
    const rows = ensureExerciseSetRows(ex).setRows ?? [];
    return acc + rows.filter((r) => r.completed).length;
  }, 0);
  const totalSets = session.exercises.reduce(
    (acc, ex) => acc + (ensureExerciseSetRows(ex).setRows?.length ?? 0),
    0
  );
  const restVerse = rest
    ? getTriggerVerse('strength', rest.verseKey)
    : getTriggerVerse('strength', session.sessionId);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.gold} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.timer}>{formatDuration(elapsed)}</Text>
          <Text style={styles.timerSub}>
            {completedSets}/{totalSets} sets · {paused ? 'Paused' : 'Live'}
          </Text>
        </View>
        <Pressable onPress={onFinish} hitSlop={12}>
          <Text style={styles.finishBtn}>Finish</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>{session.title}</Text>

      <View style={styles.controlRow}>
        <Pressable
          style={styles.controlBtn}
          onPress={() => (paused ? resumeSession() : pauseSession())}>
          <Text style={styles.controlTxt}>{paused ? 'Resume' : 'Pause'}</Text>
        </Pressable>
        <Pressable
          style={styles.controlBtnDanger}
          onPress={() => {
            Alert.alert('Discard workout?', 'Progress for this session will be lost.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Discard',
                style: 'destructive',
                onPress: () => {
                  cancelSession();
                  router.replace('/(tabs)/train');
                },
              },
            ]);
          }}>
          <Text style={styles.controlTxtDanger}>Discard</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}>
        {session.exercises.map((exercise, exIndex) => {
          const normalized = ensureExerciseSetRows(exercise);
          const rows = normalized.setRows ?? [];
          return (
            <View key={exercise.id} style={styles.exCard}>
              <View style={styles.exHead}>
                <ExerciseIcon catalogExerciseId={normalized.catalogExerciseId} />
                <Text style={styles.exName}>{normalized.name}</Text>
              </View>
              {rows.map((row, rowIndex) => {
                const isFocused =
                  focus?.exerciseIndex === exIndex && focus?.setRowIndex === rowIndex;
                const repValue = parseTargetReps(row.actualReps ?? row.targetReps);
                const weightValue = row.weightLb ?? 0;
                return (
                  <View
                    key={row.id}
                    style={[
                      styles.setCard,
                      isFocused && styles.setCardFocused,
                      row.completed && styles.setCardDone,
                    ]}>
                    <View style={styles.setCardHeader}>
                      <Pressable
                        onPress={() => handleSetPress(exIndex, rowIndex, row.completed ?? false)}
                        style={styles.checkBtn}
                        hitSlop={8}>
                        <MaterialIcons
                          name={row.completed ? 'check-circle' : 'radio-button-unchecked'}
                          size={26}
                          color={row.completed ? theme.colors.gold : theme.colors.onSurfaceVariant}
                        />
                      </Pressable>
                      <View style={styles.setBadge}>
                        <Text style={styles.setBadgeText}>{rowIndex + 1}</Text>
                      </View>
                      <Text style={styles.setCardTitle}>Set {rowIndex + 1}</Text>
                    </View>
                    <View style={styles.setFields}>
                      <NumberStepper
                        label="Weight"
                        suffix="lb"
                        value={weightValue}
                        onChange={(n) =>
                          updateSetRow(exIndex, rowIndex, { weightLb: n || undefined })
                        }
                        min={0}
                        max={500}
                        step={2.5}
                        allowKeyboardInput
                        keyboardType="decimal-pad"
                        compact
                      />
                      <NumberStepper
                        label="Reps"
                        value={repValue}
                        onChange={(n) =>
                          updateSetRow(exIndex, rowIndex, { actualReps: String(n) })
                        }
                        min={1}
                        max={50}
                        compact
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      <RestTimerOverlay
        visible={rest != null}
        seconds={rest?.seconds ?? 90}
        verse={restVerse}
        nextLabel={rest?.nextLabel ?? ''}
        onSkip={endRest}
        onComplete={endRest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  timer: {
    fontFamily: theme.fonts.headline,
    fontSize: 32,
    color: theme.colors.gold,
    letterSpacing: 1,
  },
  timerSub: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  finishBtn: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    color: theme.colors.gold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: theme.fonts.headline,
    fontSize: 22,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  controlRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  controlBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.gold,
    paddingVertical: 10,
    alignItems: 'center',
  },
  controlTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    color: theme.colors.gold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  controlBtnDanger: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    paddingVertical: 10,
    alignItems: 'center',
  },
  controlTxtDanger: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  exCard: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 14,
    marginBottom: 14,
    gap: 10,
  },
  exHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  exName: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 16,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    flex: 1,
  },
  setCard: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerHigh,
    padding: 12,
  },
  setCardFocused: {
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.surfaceContainer,
  },
  setCardDone: { opacity: 0.7 },
  setCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  checkBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setBadgeText: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 12,
    color: theme.colors.onGold,
  },
  setCardTitle: {
    flex: 1,
    fontFamily: theme.fonts.label,
    fontSize: 11,
    color: theme.colors.onBackground,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  setFields: { flexDirection: 'row', gap: 10 },
});
