import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { hapticImpact } from '@/lib/haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfettiBurst } from '@/components/ConfettiBurst';
import { ExerciseEditorModal } from '@/components/plan/ExerciseEditorModal';
import { ExerciseNotesButton } from '@/components/plan/ExerciseNotesButton';
import { ExerciseNotesModal } from '@/components/plan/ExerciseNotesModal';
import { NumberStepper } from '@/components/plan/NumberStepper';
import { ExerciseIcon } from '@/components/plan/ExerciseIcon';
import { RestTimerOverlay } from '@/components/workout/RestTimerOverlay';
import { theme } from '@/constants/theme';
import { formatDuration } from '@/lib/formatDuration';
import { paywallHref, track } from '@/lib/analytics';
import { ensureExerciseSetRows } from '@/lib/exerciseNormalize';
import { parseTargetReps } from '@/lib/repUtils';
import { resolveDailyVerse } from '@/lib/dailyVerse';
import {
  buildWorkoutVerseCycle,
  verseForRestIndex,
  WORKOUT_VERSE_CYCLE_SIZE,
} from '@/lib/workoutVerseCycle';
import { prefetchVersePassage } from '@/lib/versePassageCache';
import { useActiveWorkoutStore } from '@/stores/activeWorkoutStore';
import { useDailyContentStore } from '@/stores/dailyContentStore';
import { useExerciseHistoryStore } from '@/stores/exerciseHistoryStore';
import { useRestVerseModeStore } from '@/stores/restVerseModeStore';
import { hasEssentialsAccess, useSubscriptionStore } from '@/stores/subscriptionStore';
import { useVerseModalStore } from '@/stores/verseModalStore';
import { useWorkoutLibraryStore } from '@/stores/workoutLibraryStore';
import { useWorkoutSessionLogStore } from '@/stores/workoutSessionLogStore';
import type { Exercise } from '@/types/plan';

type Focus = { exerciseIndex: number; setRowIndex: number };

type RestState = {
  seconds: number;
  nextLabel: string;
  nextFocus: Focus | null;
  verseIndex: number;
};

type EditorState = { mode: 'add' };

type NotesEditorState = { exerciseIndex: number; exercise: Exercise };

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
  const updateExercise = useActiveWorkoutStore((s) => s.updateExercise);
  const addExercise = useActiveWorkoutStore((s) => s.addExercise);
  const getElapsedSeconds = useActiveWorkoutStore((s) => s.getElapsedSeconds);
  const applySessionProgress = useWorkoutLibraryStore((s) => s.applySessionProgress);
  const showVerse = useVerseModalStore((s) => s.show);
  const dailyContent = useDailyContentStore((s) => s.content);
  const dailyVerse = useMemo(
    () => resolveDailyVerse(dailyContent),
    [dailyContent]
  );
  const restVerseMode = useRestVerseModeStore((s) => s.mode);
  const tier = useSubscriptionStore((s) => s.tier);
  const canUseRestVerseCycle = hasEssentialsAccess(tier);
  const restVerseCounterRef = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [rest, setRest] = useState<RestState | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [notesEditor, setNotesEditor] = useState<NotesEditorState | null>(null);
  const [celebrateKey, setCelebrateKey] = useState(0);
  const workoutVerseCycle = useMemo(() => {
    if (!session) return [];
    return buildWorkoutVerseCycle(session.sessionId, dailyVerse);
  }, [session?.sessionId, dailyVerse]);
  const restVerse = useMemo(() => {
    if (!canUseRestVerseCycle || restVerseMode === 'daily' || rest == null) return dailyVerse;
    return verseForRestIndex(workoutVerseCycle, rest.verseIndex);
  }, [canUseRestVerseCycle, restVerseMode, dailyVerse, rest?.verseIndex, workoutVerseCycle]);
  const restVerseSubtitle = useMemo(() => {
    if (!canUseRestVerseCycle) return "Today's word";
    if (restVerseMode === 'daily') return "Today's word";
    if (rest == null) return 'Word for this rest';
    const position = (rest.verseIndex % WORKOUT_VERSE_CYCLE_SIZE) + 1;
    return `Word for this rest · ${position} of ${WORKOUT_VERSE_CYCLE_SIZE}`;
  }, [canUseRestVerseCycle, restVerseMode, rest?.verseIndex]);
  const onRestVerseUpgrade = useCallback(() => {
    router.push(paywallHref('rest_verses_gate'));
  }, []);

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

  useEffect(() => {
    if (!session) return;
    restVerseCounterRef.current = 0;
  }, [session?.sessionId]);

  useEffect(() => {
    void useDailyContentStore.getState().load();
  }, []);

  useEffect(() => {
    prefetchVersePassage(dailyVerse);
    if (canUseRestVerseCycle && restVerseMode === 'cycle') {
      for (const verse of workoutVerseCycle) {
        prefetchVersePassage(verse);
      }
    }
  }, [dailyVerse, canUseRestVerseCycle, restVerseMode, workoutVerseCycle]);

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
    hapticImpact();
    setCelebrateKey((k) => k + 1);

    const updated = useActiveWorkoutStore.getState().session;
    if (!updated) return;
    const nextFocus = findNextIncompleteSet(updated.exercises, exerciseIndex, setRowIndex);
    const restSec = row?.restSec ?? exercise.restSec ?? 90;

    if (nextFocus) {
      const verseIndex = restVerseCounterRef.current;
      restVerseCounterRef.current += 1;
      setRest({
        seconds: restSec,
        nextLabel: focusLabel(updated.exercises, nextFocus),
        nextFocus,
        verseIndex,
      });
    } else {
      setFocus(null);
    }
  };

  const finishAndExit = (saveProgress: boolean) => {
    if (!session) return;
    const finishedAt = new Date().toISOString();
    const durationSec = getElapsedSeconds();
    const completed = session.exercises.reduce((acc, ex) => {
      const rows = ensureExerciseSetRows(ex).setRows ?? [];
      return acc + rows.filter((r) => r.completed).length;
    }, 0);
    const total = session.exercises.reduce(
      (acc, ex) => acc + (ensureExerciseSetRows(ex).setRows?.length ?? 0),
      0
    );
    track('workout completed', {
      duration_sec: durationSec,
      sets_completed: completed,
      total_sets: total,
      completion_pct: total > 0 ? completed / total : 0,
      saved_progress: saveProgress,
      source_workout_id: session.sourceWorkoutId,
    });
    if (saveProgress) {
      applySessionProgress(session.sourceWorkoutId, session.exercises);
    }
    useExerciseHistoryStore.getState().logSession({
      sessionId: session.sessionId,
      sourceWorkoutId: session.sourceWorkoutId,
      exercises: session.exercises,
      finishedAt,
    });
    useWorkoutSessionLogStore.getState().logCompletedSession({
      title: session.title,
      sourceWorkoutId: session.sourceWorkoutId,
      durationSec,
      finishedAt,
    });
    finishSession();
    showVerse(dailyVerse, 'Whatever you do, work at it with all your heart.');
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
  return (
    <View style={styles.screen}>
      <View style={[styles.content, { paddingTop: insets.top + 8 }]}>
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
                  const completed = session.exercises.reduce((acc, ex) => {
                    const rows = ensureExerciseSetRows(ex).setRows ?? [];
                    return acc + rows.filter((r) => r.completed).length;
                  }, 0);
                  const total = session.exercises.reduce(
                    (acc, ex) => acc + (ensureExerciseSetRows(ex).setRows?.length ?? 0),
                    0
                  );
                  track('workout discarded', {
                    duration_sec: getElapsedSeconds(),
                    sets_completed: completed,
                    total_sets: total,
                  });
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
                <ExerciseIcon catalogExerciseId={normalized.catalogExerciseId} size={28} />
                <Text style={styles.exName}>{normalized.name}</Text>
                <ExerciseNotesButton
                  hasNotes={Boolean(normalized.notes)}
                  onPress={() => setNotesEditor({ exerciseIndex: exIndex, exercise: normalized })}
                />
              </View>
              {normalized.notes ? (
                <Text style={styles.exNotes}>{normalized.notes}</Text>
              ) : null}
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

        <Pressable style={styles.addExerciseBtn} onPress={() => setEditor({ mode: 'add' })}>
          <MaterialIcons name="add" size={22} color={theme.colors.background} />
          <Text style={styles.addExerciseTxt}>Add exercise</Text>
        </Pressable>
      </ScrollView>

      <ExerciseEditorModal
        visible={editor != null}
        mode="add"
        exercise={null}
        dayIndex={null}
        exerciseIndex={null}
        onClose={() => setEditor(null)}
        onSave={(exercise) => {
          addExercise(exercise);
          setEditor(null);
          const updated = useActiveWorkoutStore.getState().session;
          if (!updated) return;
          const newIndex = updated.exercises.length - 1;
          const incomplete = findFirstIncompleteSet(updated.exercises);
          if (incomplete) setFocus(incomplete);
          else setFocus({ exerciseIndex: newIndex, setRowIndex: 0 });
        }}
      />

      <ExerciseNotesModal
        visible={notesEditor != null}
        exerciseName={notesEditor?.exercise.name ?? ''}
        notes={notesEditor?.exercise.notes ?? ''}
        onClose={() => setNotesEditor(null)}
        onSave={(notes) => {
          if (!notesEditor) return;
          updateExercise(notesEditor.exerciseIndex, { notes });
          setNotesEditor(null);
        }}
      />

      </View>

      <RestTimerOverlay
        visible={rest != null}
        seconds={rest?.seconds ?? 90}
        verse={restVerse}
        verseSubtitle={restVerseSubtitle}
        verseUpgradeLabel={canUseRestVerseCycle ? undefined : 'Upgrade for more verses'}
        onVerseUpgradePress={canUseRestVerseCycle ? undefined : onRestVerseUpgrade}
        nextLabel={rest?.nextLabel ?? ''}
        celebrateKey={celebrateKey}
        onSkip={endRest}
        onComplete={endRest}
      />
      {rest == null ? <ConfettiBurst playKey={celebrateKey} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1 },
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
  exNotes: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginBottom: 4,
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
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.gold,
    paddingVertical: 14,
    marginTop: 4,
  },
  addExerciseTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.background,
    textTransform: 'uppercase',
  },
});
