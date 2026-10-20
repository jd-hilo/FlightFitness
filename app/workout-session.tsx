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
import { EditSessionDurationModal } from '@/components/insights/EditSessionDurationModal';
import { RestTimerOverlay } from '@/components/workout/RestTimerOverlay';
import { SetValueInput } from '@/components/workout/SetValueInput';
import { theme } from '@/constants/theme';
import { formatDuration } from '@/lib/formatDuration';
import { volumeLbFromExercises } from '@/lib/insights/workoutInsights';
import { paywallHref, track } from '@/lib/analytics';
import { scheduleFirstWorkoutReviewPrompt } from '@/lib/appReview';
import { ensureExerciseSetRows } from '@/lib/exerciseNormalize';
import { flushTrackingRemoteSave } from '@/lib/api/trackingPersistence';
import { parseTargetReps } from '@/lib/repUtils';
import { resolveDailyVerse } from '@/lib/dailyVerse';
import {
  findFirstIncompleteSet,
  findNextIncompleteSet,
  focusLabel,
  isIntraSupersetAdvance,
  isSupersetMember,
  supersetLetter,
  type SetFocus,
} from '@/lib/superset';
import {
  buildWorkoutVerseCycle,
  verseForRestIndex,
  WORKOUT_VERSE_CYCLE_SIZE,
} from '@/lib/workoutVerseCycle';
import { prefetchVersePassage } from '@/lib/versePassageCache';
import { isScreenshotMode, screenshotSearchParam } from '@/lib/screenshotMode';
import { SCREENSHOT_WORKOUT_IDS, screenshotNow } from '@/screenshot/fixtures';
import { useActiveWorkoutStore } from '@/stores/activeWorkoutStore';
import { useDailyContentStore } from '@/stores/dailyContentStore';
import { useExerciseHistoryStore } from '@/stores/exerciseHistoryStore';
import { useRestVerseModeStore } from '@/stores/restVerseModeStore';
import { hasEssentialsAccess, useSubscriptionStore } from '@/stores/subscriptionStore';
import { useVerseModalStore } from '@/stores/verseModalStore';
import { formatYmdLocal } from '@/lib/weekUtils';
import { useWorkoutLibraryStore } from '@/stores/workoutLibraryStore';
import {
  useWorkoutSessionLogStore,
  type WorkoutSessionLogEntry,
} from '@/stores/workoutSessionLogStore';
import type { Exercise } from '@/types/plan';

type Focus = SetFocus;

type RestState = {
  seconds: number;
  /** Epoch ms when this rest ends. Survives the app being backgrounded. */
  endsAt: number;
  nextLabel: string;
  nextFocus: Focus | null;
  verseIndex: number;
};

type EditorState = { mode: 'add' };

/** Sessions longer than this were probably left running by accident. */
const LONG_WORKOUT_SEC = 3 * 60 * 60;

type NotesEditorState = { exerciseIndex: number; exercise: Exercise };

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
  /** Exercise the user tapped open; cleared whenever the active set moves. */
  const [openOverride, setOpenOverride] = useState<number | null>(null);
  const [rest, setRest] = useState<RestState | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [notesEditor, setNotesEditor] = useState<NotesEditorState | null>(null);
  const [celebrateKey, setCelebrateKey] = useState(0);
  const [durationFix, setDurationFix] = useState<WorkoutSessionLogEntry | null>(null);
  const exitAfterFixRef = useRef<(() => void) | null>(null);
  const workoutVerseCycle = useMemo(() => {
    if (!session) return [];
    return buildWorkoutVerseCycle(session.sessionId, dailyVerse);
  }, [session?.sessionId, dailyVerse]);
  const restVerse = useMemo(() => {
    if (!canUseRestVerseCycle || restVerseMode === 'daily' || rest == null) return dailyVerse;
    return verseForRestIndex(workoutVerseCycle, rest.verseIndex);
  }, [canUseRestVerseCycle, restVerseMode, dailyVerse, rest?.verseIndex, workoutVerseCycle]);
  const rotatingRestVerses = canUseRestVerseCycle && restVerseMode === 'cycle';
  const restVerseSubtitle = rotatingRestVerses ? 'Word for this rest' : "Today's word";
  const restVersePosition = useMemo(() => {
    if (!rotatingRestVerses || rest == null) return undefined;
    const total = workoutVerseCycle.length || WORKOUT_VERSE_CYCLE_SIZE;
    return { index: rest.verseIndex % total, total };
  }, [rotatingRestVerses, rest?.verseIndex, workoutVerseCycle.length]);
  const onRestVerseUpgrade = useCallback(() => {
    router.push(paywallHref('rest_verses_gate'));
  }, []);

  useEffect(() => {
    if (!isScreenshotMode) return;
    if (useActiveWorkoutStore.getState().session) return;
    const upper = useWorkoutLibraryStore
      .getState()
      .workouts.find((w) => w.id === SCREENSHOT_WORKOUT_IDS.upper);
    if (!upper) return;
    useActiveWorkoutStore.getState().startSession(upper);
    const live = useActiveWorkoutStore.getState().session;
    if (!live) return;
    const startedAt = new Date(screenshotNow().getTime() - 8 * 60 * 1000).toISOString();
    const bench = live.exercises[0];
    const rows = (bench?.setRows ?? []).map((row, i) =>
      i === 0 ? { ...row, completed: true, actualReps: row.actualReps ?? row.targetReps } : row
    );
    const exercises = live.exercises.map((ex, i) =>
      i === 0 ? { ...ex, setRows: rows } : ex
    );
    useActiveWorkoutStore.setState({
      session: { ...live, startedAt, exercises },
    });
  }, []);

  useEffect(() => {
    if (isScreenshotMode && !session) return;
    if (!session) {
      router.replace('/(tabs)/train');
      return;
    }
    if (isScreenshotMode) {
      setFocus({ exerciseIndex: 0, setRowIndex: 1 });
      if (screenshotSearchParam('rest') === '1') {
        const nextFocus = { exerciseIndex: 0, setRowIndex: 2 };
        setRest({
          seconds: 90,
          endsAt: Date.now() + 72 * 1000,
          nextLabel: focusLabel(session.exercises, nextFocus),
          nextFocus,
          verseIndex: 0,
        });
      }
    } else {
      setFocus(findFirstIncompleteSet(session.exercises));
    }
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

  useEffect(() => {
    setOpenOverride(null);
  }, [focus?.exerciseIndex, focus?.setRowIndex]);

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
    const from: Focus = { exerciseIndex, setRowIndex };
    const nextFocus = findNextIncompleteSet(updated.exercises, exerciseIndex, setRowIndex);

    if (!nextFocus) {
      setFocus(null);
      return;
    }

    // A → B inside the same round: keep momentum, skip full rest overlay.
    if (isIntraSupersetAdvance(updated.exercises, from, nextFocus)) {
      setFocus(nextFocus);
      return;
    }

    const restSec = row?.restSec ?? exercise.restSec ?? 90;
    const verseIndex = restVerseCounterRef.current;
    restVerseCounterRef.current += 1;
    setRest({
      seconds: restSec,
      endsAt: Date.now() + restSec * 1000,
      nextLabel: focusLabel(updated.exercises, nextFocus),
      nextFocus,
      verseIndex,
    });
  };

  const finishAndExit = (saveProgress: boolean) => {
    const live = useActiveWorkoutStore.getState().session;
    if (!live) return;
    const finishedAt = new Date().toISOString();
    const durationSec = getElapsedSeconds();
    const volumeLb = volumeLbFromExercises(live.exercises);
    const completed = live.exercises.reduce((acc, ex) => {
      const rows = ensureExerciseSetRows(ex).setRows ?? [];
      return acc + rows.filter((r) => r.completed).length;
    }, 0);
    const performed = live.exercises.reduce((acc, ex) => {
      const rows = ensureExerciseSetRows(ex).setRows ?? [];
      return (
        acc +
        rows.filter(
          (r) => r.completed === true || !!r.actualReps?.trim()
        ).length
      );
    }, 0);
    const total = live.exercises.reduce(
      (acc, ex) => acc + (ensureExerciseSetRows(ex).setRows?.length ?? 0),
      0
    );
    track('workout completed', {
      duration_sec: durationSec,
      sets_completed: completed,
      sets_performed: performed,
      total_sets: total,
      volume_lb: volumeLb,
      completion_pct: total > 0 ? completed / total : 0,
      saved_progress: saveProgress,
      source_workout_id: live.sourceWorkoutId,
    });
    if (saveProgress) {
      applySessionProgress(live.sourceWorkoutId, live.exercises);
    }
    const isFirstWorkout =
      useWorkoutSessionLogStore.getState().sessions.length === 0;
    const logged = useExerciseHistoryStore.getState().logSession({
      sessionId: live.sessionId,
      sourceWorkoutId: live.sourceWorkoutId,
      exercises: live.exercises,
      finishedAt,
    });
    useWorkoutSessionLogStore.getState().logCompletedSession({
      id: live.sessionId,
      title: live.title,
      sourceWorkoutId: live.sourceWorkoutId,
      durationSec,
      volumeLb,
      finishedAt,
    });
    if (__DEV__ && performed > 0 && logged === 0) {
      console.warn(
        '[workout] performed sets were not written to exercise history',
        { performed, volumeLb, sessionId: live.sessionId }
      );
    }

    const exit = () => {
      finishSession();
      showVerse(dailyVerse, 'Whatever you do, work at it with all your heart.');
      if (isFirstWorkout) scheduleFirstWorkoutReviewPrompt();
      router.replace('/(tabs)/train');
    };

    void (async () => {
      await flushTrackingRemoteSave();
      if (durationSec > LONG_WORKOUT_SEC) {
        exitAfterFixRef.current = exit;
        Alert.alert(
          'Forget to end your workout?',
          `This session logged as ${formatDuration(durationSec)}. Want to edit the duration?`,
          [
            { text: `Keep ${formatDuration(durationSec)}`, style: 'cancel', onPress: exit },
            {
              text: 'Edit duration',
              onPress: () =>
                setDurationFix({
                  id: live.sessionId,
                  title: live.title,
                  sourceWorkoutId: live.sourceWorkoutId,
                  dateKey: formatYmdLocal(new Date(finishedAt)),
                  finishedAt,
                  durationSec,
                  volumeLb,
                }),
            },
          ]
        );
        return;
      }
      exit();
    })();
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

  const onFinish = () => {
    const setsNote =
      completedSets === 0
        ? ' No sets checked yet — change weight/reps or tap the checkmark so weight moved is saved.'
        : ` ${completedSets}/${totalSets} sets complete.`;
    Alert.alert(
      'Finish workout?',
      `${formatDuration(elapsed)} logged.${setsNote} Save your weights and reps to this workout for next time?`,
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

  const onDiscard = () => {
    Alert.alert('Discard workout?', 'Progress for this session will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          track('workout discarded', {
            duration_sec: getElapsedSeconds(),
            sets_completed: completedSets,
            total_sets: totalSets,
          });
          cancelSession();
          router.replace('/(tabs)/train');
        },
      },
    ]);
  };

  const onMore = () => {
    Alert.alert(session.title, undefined, [
      {
        text: paused ? 'Resume timer' : 'Pause timer',
        onPress: () => (paused ? resumeSession() : pauseSession()),
      },
      { text: 'Add exercise', onPress: () => setEditor({ mode: 'add' }) },
      { text: 'Discard workout', style: 'destructive', onPress: onDiscard },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const openIndex = openOverride ?? focus?.exerciseIndex ?? 0;

  return (
    <View style={styles.screen}>
      <View style={[styles.content, { paddingTop: insets.top + 6 }]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Back">
            <MaterialIcons name="arrow-back" size={24} color={theme.colors.onBackground} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.title} numberOfLines={1}>
              {session.title}
            </Text>
            <Text style={styles.titleSub}>
              {formatDuration(elapsed)} · {completedSets}/{totalSets} sets
              {paused ? ' · Paused' : ''}
            </Text>
          </View>
          <Pressable
            onPress={onMore}
            hitSlop={12}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Workout options">
            <MaterialIcons name="more-horiz" size={26} color={theme.colors.onBackground} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 110, paddingHorizontal: 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {session.exercises.map((exercise, exIndex) => {
            const normalized = ensureExerciseSetRows(exercise);
            const rows = normalized.setRows ?? [];
            const doneCount = rows.filter((r) => r.completed).length;
            const allDone = rows.length > 0 && doneCount === rows.length;
            const letter = supersetLetter(session.exercises, exIndex);
            const inSuperset = isSupersetMember(normalized);

            if (exIndex !== openIndex) {
              return (
                <Pressable
                  key={exercise.id}
                  style={({ pressed }) => [styles.exRow, pressed && styles.pressed]}
                  onPress={() => setOpenOverride(exIndex)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${normalized.name}`}>
                  {letter ? (
                    <View style={styles.letterBadge}>
                      <Text style={styles.letterBadgeTxt}>{letter}</Text>
                    </View>
                  ) : (
                    <MaterialIcons name="drag-handle" size={22} color={theme.colors.onSurfaceVariant} />
                  )}
                  <View style={styles.exRowText}>
                    <Text style={[styles.exRowName, allDone && styles.exRowNameDone]} numberOfLines={1}>
                      {normalized.name}
                    </Text>
                    <Text style={styles.exRowMeta}>
                      {rows.length} × {normalized.reps}
                    </Text>
                  </View>
                  {allDone ? (
                    <View style={styles.checkFilled}>
                      <MaterialIcons name="check" size={18} color={theme.colors.onChampagne} />
                    </View>
                  ) : doneCount > 0 ? (
                    <Text style={styles.partialTxt}>
                      {doneCount}/{rows.length}
                    </Text>
                  ) : (
                    <View style={styles.checkEmpty} />
                  )}
                </Pressable>
              );
            }

            const isUpNext = focus?.exerciseIndex === exIndex && !allDone;
            return (
              <View key={exercise.id} style={styles.openCard}>
                <View style={styles.openHeadRow}>
                  <Text style={styles.kicker}>
                    {allDone
                      ? 'Complete'
                      : isUpNext
                        ? 'Up next'
                        : `Exercise ${exIndex + 1}`}
                    {inSuperset && letter ? ` · Superset ${letter}` : ''}
                  </Text>
                  <ExerciseNotesButton
                    noteCount={normalized.notes?.trim() ? 1 : 0}
                    onPress={() => setNotesEditor({ exerciseIndex: exIndex, exercise: normalized })}
                    size={18}
                  />
                </View>
                <View style={styles.openTitleRow}>
                  <Text style={styles.openName}>{normalized.name}</Text>
                  {allDone ? (
                    <View style={[styles.checkFilled, styles.checkLarge]}>
                      <MaterialIcons name="check" size={22} color={theme.colors.onChampagne} />
                    </View>
                  ) : null}
                </View>
                <Text style={styles.openMeta} numberOfLines={1}>
                  {rows.length} {rows.length === 1 ? 'set' : 'sets'} · {normalized.reps} reps · {formatRest(normalized.restSec)} rest
                </Text>
                {normalized.notes ? (
                  <Text style={styles.exNotes}>{normalized.notes}</Text>
                ) : null}

                <View style={styles.setList}>
                  {rows.map((row, rowIndex) => {
                    const isFocused =
                      focus?.exerciseIndex === exIndex && focus?.setRowIndex === rowIndex;
                    const done = row.completed ?? false;
                    return (
                      <View key={row.id} style={styles.setRow}>
                        <Text style={[styles.setLabel, isFocused && styles.setLabelFocused]}>
                          Set {rowIndex + 1}
                        </Text>
                        <SetValueInput
                          value={row.weightLb ?? 0}
                          decimal
                          max={1500}
                          done={done}
                          accessibilityLabel={`Set ${rowIndex + 1} weight`}
                          onCommit={(n) =>
                            updateSetRow(exIndex, rowIndex, { weightLb: n || undefined })
                          }
                        />
                        <Text style={styles.unit}>lbs</Text>
                        <Text style={styles.times}>×</Text>
                        <SetValueInput
                          value={parseTargetReps(row.actualReps ?? row.targetReps)}
                          min={1}
                          max={100}
                          done={done}
                          accessibilityLabel={`Set ${rowIndex + 1} reps`}
                          onCommit={(n) =>
                            updateSetRow(exIndex, rowIndex, { actualReps: String(n) })
                          }
                        />
                        <Pressable
                          onPress={() => handleSetPress(exIndex, rowIndex, done)}
                          hitSlop={10}
                          style={styles.setCheckHit}
                          accessibilityRole="button"
                          accessibilityLabel={
                            done ? `Undo set ${rowIndex + 1}` : `Complete set ${rowIndex + 1}`
                          }>
                          {done ? (
                            <View style={styles.checkFilled}>
                              <MaterialIcons name="check" size={18} color={theme.colors.onChampagne} />
                            </View>
                          ) : (
                            <View style={[styles.checkEmpty, isFocused && styles.checkEmptyFocused]} />
                          )}
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}

          <Pressable
            style={({ pressed }) => [styles.addExerciseBtn, pressed && styles.pressed]}
            onPress={() => setEditor({ mode: 'add' })}>
            <MaterialIcons name="add" size={20} color={theme.colors.onBackground} />
            <Text style={styles.addExerciseTxt}>Add exercise</Text>
          </Pressable>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
          <Pressable
            style={({ pressed }) => [styles.pauseBtn, pressed && styles.pressed]}
            onPress={() => (paused ? resumeSession() : pauseSession())}
            accessibilityRole="button"
            accessibilityLabel={paused ? 'Resume timer' : 'Pause timer'}>
            <MaterialIcons
              name={paused ? 'play-arrow' : 'pause'}
              size={24}
              color={theme.colors.onBackground}
            />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.finishBtn, pressed && styles.pressed]}
            onPress={onFinish}
            accessibilityRole="button">
            <Text style={styles.finishTxt}>Finish workout</Text>
          </Pressable>
        </View>

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

        <EditSessionDurationModal
          visible={durationFix != null}
          session={durationFix}
          onClose={() => {
            setDurationFix(null);
            exitAfterFixRef.current?.();
            exitAfterFixRef.current = null;
          }}
          onSave={(sessionId, durationSec) => {
            useWorkoutSessionLogStore.getState().updateSessionDuration(sessionId, durationSec);
            setDurationFix(null);
            exitAfterFixRef.current?.();
            exitAfterFixRef.current = null;
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
        endsAt={rest?.endsAt}
        verse={restVerse}
        verseSubtitle={restVerseSubtitle}
        versePosition={restVersePosition}
        verseUpgradeLabel={canUseRestVerseCycle ? undefined : 'Unlock a new verse every rest'}
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

function formatRest(sec: number) {
  if (sec >= 120 && sec % 60 === 0) return `${sec / 60}m`;
  return `${sec}s`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1 },
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
    fontVariant: ['tabular-nums'],
  },
  openCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    padding: 16,
    marginBottom: 10,
  },
  openHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  kicker: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'uppercase',
  },
  openTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  openName: {
    flex: 1,
    fontFamily: theme.fonts.headlineBold,
    fontSize: 22,
    letterSpacing: -0.3,
    color: theme.colors.onBackground,
  },
  openMeta: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },
  exNotes: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.onSurfaceVariant,
    marginTop: 8,
  },
  setList: {
    marginTop: 14,
    gap: 10,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setLabel: {
    width: 44,
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    flexShrink: 0,
  },
  setLabelFocused: {
    fontFamily: theme.fonts.labelBold,
    color: theme.colors.champagne,
  },
  unit: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    flexShrink: 0,
  },
  times: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    flexShrink: 0,
  },
  setCheckHit: {
    marginLeft: 'auto',
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkFilled: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.champagne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLarge: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  checkEmpty: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.32)',
  },
  checkEmptyFocused: {
    borderColor: theme.colors.champagne,
  },
  partialTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 13,
    color: theme.colors.champagne,
    minWidth: 30,
    textAlign: 'center',
  },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 8,
  },
  exRowText: { flex: 1, minWidth: 0 },
  exRowName: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 16,
    color: theme.colors.onBackground,
  },
  exRowNameDone: { color: 'rgba(255,255,255,0.6)' },
  exRowMeta: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  letterBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: theme.colors.champagneSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterBadgeTxt: {
    fontFamily: theme.fonts.labelBold,
    fontSize: 12,
    color: theme.colors.champagne,
  },
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 14,
    marginTop: 4,
    borderRadius: 18,
  },
  addExerciseTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 15,
    color: theme.colors.onBackground,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  pauseBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishBtn: {
    flex: 1,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.colors.champagne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishTxt: {
    fontFamily: theme.fonts.labelBold,
    fontSize: 16,
    color: theme.colors.onChampagne,
  },
});
