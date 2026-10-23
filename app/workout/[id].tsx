import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseEditorModal } from '@/components/plan/ExerciseEditorModal';
import { ExerciseIcon } from '@/components/plan/ExerciseIcon';
import { ExerciseNotesButton } from '@/components/plan/ExerciseNotesButton';
import { ExerciseNotesModal } from '@/components/plan/ExerciseNotesModal';
import { theme } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { ensureExerciseSetRows } from '@/lib/exerciseNormalize';
import { hapticImpact, hapticSelection, ImpactStyle } from '@/lib/haptics';
import {
  getContiguousSupersetIndices,
  isFirstInSuperset,
  isLastInSuperset,
  isSupersetMember,
  supersetLetter,
} from '@/lib/superset';
import { useWorkoutLibraryStore } from '@/stores/workoutLibraryStore';
import type { Exercise } from '@/types/plan';

type EditorState =
  | { mode: 'add' }
  | { mode: 'edit'; exerciseIndex: number; exercise: Exercise };

type NotesEditorState = { exerciseIndex: number; exercise: Exercise };

type DragState = { index: number; dy: number; hover: number };

type RowLayout = { y: number; height: number };

type DragApi = {
  start: (index: number) => void;
  move: (index: number, dy: number) => void;
  end: () => void;
};

function computeHover(layouts: RowLayout[], from: number, dy: number) {
  const origin = layouts[from];
  if (!origin) return from;
  const center = origin.y + origin.height / 2 + dy;
  let hover = from;
  if (dy > 0) {
    for (let i = from + 1; i < layouts.length; i++) {
      const item = layouts[i];
      if (!item) break;
      if (center > item.y + item.height / 2) hover = i;
    }
  } else if (dy < 0) {
    for (let i = from - 1; i >= 0; i--) {
      const item = layouts[i];
      if (!item) break;
      if (center < item.y + item.height / 2) hover = i;
    }
  }
  return hover;
}

function slotPitch(layouts: RowLayout[], index: number) {
  const cur = layouts[index];
  const next = layouts[index + 1];
  if (cur && next) return next.y - cur.y;
  const prev = layouts[index - 1];
  if (cur && prev) return cur.y - prev.y;
  return cur?.height ?? 0;
}

function shiftFor(layouts: RowLayout[], index: number, drag: DragState | null) {
  if (!drag) return 0;
  if (index === drag.index) return drag.dy;
  const pitch = slotPitch(layouts, drag.index);
  if (drag.index < drag.hover && index > drag.index && index <= drag.hover) return -pitch;
  if (drag.index > drag.hover && index >= drag.hover && index < drag.index) return pitch;
  return 0;
}

function DragHandle({ index, api }: { index: number; api: RefObject<DragApi | null> }) {
  const indexRef = useRef(index);
  indexRef.current = index;
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => api.current?.start(indexRef.current),
      onPanResponderMove: (_evt, gesture) => api.current?.move(indexRef.current, gesture.dy),
      onPanResponderRelease: () => api.current?.end(),
      onPanResponderTerminate: () => api.current?.end(),
    })
  ).current;

  return (
    <View
      {...pan.panHandlers}
      style={styles.dragHandle}
      accessibilityRole="adjustable"
      accessibilityLabel="Drag to reorder">
      <MaterialIcons name="drag-handle" size={22} color="rgba(255,255,255,0.45)" />
    </View>
  );
}

function onboardingParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === '1';
}

export default function WorkoutDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id, onboarding } = useLocalSearchParams<{ id: string; onboarding?: string | string[] }>();
  const fromOnboarding = onboardingParam(onboarding);
  const workouts = useWorkoutLibraryStore((s) => s.workouts);
  const updateWorkoutTitle = useWorkoutLibraryStore((s) => s.updateWorkoutTitle);
  const addExercise = useWorkoutLibraryStore((s) => s.addExercise);
  const updateExercise = useWorkoutLibraryStore((s) => s.updateExercise);
  const removeExercise = useWorkoutLibraryStore((s) => s.removeExercise);
  const reorderExercises = useWorkoutLibraryStore((s) => s.reorderExercises);
  const [drag, setDrag] = useState<DragState | null>(null);
  const layoutsRef = useRef<RowLayout[]>([]);
  const dragRef = useRef<DragState | null>(null);
  const workoutIdRef = useRef(id ?? '');
  const lastHoverRef = useRef(0);
  const reorderRef = useRef(reorderExercises);
  reorderRef.current = reorderExercises;
  workoutIdRef.current = id ?? '';

  const dragApi = useRef<DragApi>({
    start(index) {
      lastHoverRef.current = index;
      const next = { index, dy: 0, hover: index };
      dragRef.current = next;
      setDrag(next);
      hapticImpact(ImpactStyle.Light);
    },
    move(index, dy) {
      const hover = computeHover(layoutsRef.current, index, dy);
      if (hover !== lastHoverRef.current) {
        lastHoverRef.current = hover;
        hapticSelection();
      }
      const next = { index, dy, hover };
      dragRef.current = next;
      setDrag(next);
    },
    end() {
      const current = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!current || current.hover === current.index) return;
      reorderRef.current(workoutIdRef.current, current.index, current.hover);
    },
  });
  const linkWithPreviousAsSuperset = useWorkoutLibraryStore(
    (s) => s.linkWithPreviousAsSuperset
  );
  const unlinkSuperset = useWorkoutLibraryStore((s) => s.unlinkSuperset);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [notesEditor, setNotesEditor] = useState<NotesEditorState | null>(null);
  const [titleDraft, setTitleDraft] = useState('');

  const workout = useMemo(
    () => workouts.find((w) => w.id === id) ?? null,
    [workouts, id]
  );

  useEffect(() => {
    if (workout) setTitleDraft(workout.title);
  }, [workout?.id, workout?.title]);

  const startedAtRef = useRef<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (!id || fromOnboarding) return;
      const current = useWorkoutLibraryStore.getState().workouts.find((w) => w.id === id);
      if (!current) return;
      const totalSets = current.exercises.reduce(
        (acc, ex) => acc + (ensureExerciseSetRows(ex).setRows?.length ?? ex.sets),
        0
      );
      startedAtRef.current = Date.now();
      track('workout started', {
        source_workout_id: current.id,
        title: current.title,
        exercise_count: current.exercises.length,
        total_sets: totalSets,
        surface: 'saved_workout',
      });
      return () => {
        const startedAt = startedAtRef.current;
        startedAtRef.current = null;
        if (startedAt == null) return;
        const latest = useWorkoutLibraryStore.getState().workouts.find((w) => w.id === id) ?? current;
        track('workout completed', {
          duration_sec: Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
          source_workout_id: latest.id,
          title: latest.title,
          exercise_count: latest.exercises.length,
          total_sets: latest.exercises.reduce(
            (acc, ex) => acc + (ensureExerciseSetRows(ex).setRows?.length ?? ex.sets),
            0
          ),
          surface: 'saved_workout',
        });
      };
    }, [fromOnboarding, id])
  );

  useEffect(() => {
    if (id && !workout && workouts.length >= 0) {
      if (fromOnboarding) {
        router.replace('/(onboarding)/feature-slides' as Href);
        return;
      }
      router.replace('/(tabs)/train');
    }
  }, [fromOnboarding, id, workout, workouts.length]);

  const leave = useCallback(() => {
    if (id && titleDraft.trim()) {
      updateWorkoutTitle(id, titleDraft.trim());
    }
    router.back();
  }, [id, titleDraft, updateWorkoutTitle]);

  const continueOnboarding = useCallback(() => {
    if (id && titleDraft.trim()) {
      updateWorkoutTitle(id, titleDraft.trim());
    }
    router.push('/(onboarding)/feature-slides' as Href);
  }, [id, titleDraft, updateWorkoutTitle]);

  if (!workout) return null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable
          onPress={leave}
          hitSlop={12}
          style={styles.headerIcon}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.onBackground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {titleDraft.trim() || 'Edit workout'}
          </Text>
          <Text style={styles.headerSub}>
            {workout.exercises.length} exercise{workout.exercises.length === 1 ? '' : 's'}
          </Text>
        </View>
        <Pressable onPress={leave} hitSlop={12} style={styles.headerIcon}>
          <Text style={styles.headerBtnPrimary}>Save</Text>
        </Pressable>
      </View>

      <ScrollView
        style={fromOnboarding ? { flex: 1 } : undefined}
        scrollEnabled={drag == null}
        contentContainerStyle={{
          paddingBottom: fromOnboarding ? 24 : insets.bottom + 40,
          paddingHorizontal: 16,
        }}>
        <Text style={styles.label}>Workout name</Text>
        <TextInput
          style={styles.input}
          value={titleDraft}
          onChangeText={setTitleDraft}
          returnKeyType="done"
          blurOnSubmit
          onBlur={() => {
            if (titleDraft.trim()) updateWorkoutTitle(workout.id, titleDraft.trim());
          }}
        />

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Exercises</Text>
          <Pressable onPress={() => setEditor({ mode: 'add' })}>
            <View style={styles.addChip}>
              <MaterialIcons name="add" size={16} color={theme.colors.onChampagne} />
              <Text style={styles.addChipTxt}>Add</Text>
            </View>
          </Pressable>
        </View>

        {workout.exercises.length >= 2 ? (
          <Text style={styles.hint}>
            Drag the handle to reorder. Link an exercise with the one above to train them as a
            superset (A → B → rest).
          </Text>
        ) : null}

        {workout.exercises.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.muted}>Add exercises before you begin this workout.</Text>
            <Pressable style={styles.bigAddBtn} onPress={() => setEditor({ mode: 'add' })}>
              <MaterialIcons name="add" size={22} color={theme.colors.onChampagne} />
              <Text style={styles.bigAddTxt}>Add exercise</Text>
            </Pressable>
          </View>
        ) : null}

        {workout.exercises.map((exercise, index) => {
          const normalized = ensureExerciseSetRows(exercise);
          const inSuperset = isSupersetMember(normalized);
          const first = isFirstInSuperset(workout.exercises, index);
          const last = isLastInSuperset(workout.exercises, index);
          const letter = supersetLetter(workout.exercises, index);
          const groupSize = getContiguousSupersetIndices(workout.exercises, index).length;
          const canLinkUp =
            index > 0 &&
            (!inSuperset ||
              normalized.supersetGroupId !==
                workout.exercises[index - 1]?.supersetGroupId);

          const shift = shiftFor(layoutsRef.current, index, drag);
          const dragging = drag?.index === index;

          return (
            <View
              key={exercise.id}
              collapsable={false}
              onLayout={(event) => {
                layoutsRef.current[index] = {
                  y: event.nativeEvent.layout.y,
                  height: event.nativeEvent.layout.height,
                };
                layoutsRef.current.length = workout.exercises.length;
              }}
              style={{
                transform: [{ translateY: shift }],
                zIndex: dragging ? 2 : 0,
                elevation: dragging ? 4 : 0,
              }}>
              {first ? (
                <View style={styles.supersetBanner}>
                  <MaterialIcons name="link" size={14} color={theme.colors.champagne} />
                  <Text style={styles.supersetBannerTxt}>
                    Superset · {groupSize} moves
                  </Text>
                  <Pressable
                    onPress={() => unlinkSuperset(workout.id, index)}
                    hitSlop={8}>
                    <Text style={styles.ungroupTxt}>Ungroup</Text>
                  </Pressable>
                </View>
              ) : null}

              <View
                style={[
                  styles.exRow,
                  dragging && styles.exRowDragging,
                  inSuperset && styles.exRowSuperset,
                  first && styles.exRowSupersetFirst,
                  last && styles.exRowSupersetLast,
                  inSuperset && !last && styles.exRowSupersetMid,
                ]}>
                {workout.exercises.length >= 2 ? (
                  <DragHandle index={index} api={dragApi} />
                ) : null}
                <Pressable
                  style={styles.exMain}
                  onPress={() => setEditor({ mode: 'edit', exerciseIndex: index, exercise })}>
                {letter ? (
                  <View style={styles.letterBadge}>
                    <Text style={styles.letterBadgeTxt}>{letter}</Text>
                  </View>
                ) : null}
                <ExerciseIcon
                  catalogExerciseId={normalized.catalogExerciseId}
                  size={28}
                  fallback={Boolean(normalized.catalogExerciseId)}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.exName} numberOfLines={1}>{normalized.name}</Text>
                  <Text style={styles.exMeta} numberOfLines={1}>
                    {normalized.sets} × {normalized.reps} · {normalized.restSec}s rest
                  </Text>
                  {normalized.notes ? (
                    <Text style={styles.exNotes} numberOfLines={1}>
                      {normalized.notes}
                    </Text>
                  ) : null}
                </View>
                <ExerciseNotesButton
                  noteCount={normalized.notes?.trim() ? 1 : 0}
                  onPress={() =>
                    setNotesEditor({ exerciseIndex: index, exercise: normalized })
                  }
                />
                <MaterialIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
                </Pressable>
              </View>

              {canLinkUp ? (
                <Pressable
                  style={styles.linkUpBtn}
                  onPress={() => linkWithPreviousAsSuperset(workout.id, index)}>
                  <MaterialIcons name="link" size={14} color={theme.colors.champagne} />
                  <Text style={styles.linkUpTxt}>Superset with above</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      {fromOnboarding ? (
        <View style={[styles.onboardingBar, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            style={styles.onboardingBtn}
            onPress={continueOnboarding}
            accessibilityRole="button"
            accessibilityLabel="Continue">
            <Text style={styles.onboardingBtnTxt}>Continue</Text>
          </Pressable>
        </View>
      ) : null}

      <ExerciseEditorModal
        visible={editor != null}
        mode={editor?.mode ?? 'add'}
        exercise={editor?.mode === 'edit' ? editor.exercise : null}
        dayIndex={null}
        exerciseIndex={editor?.mode === 'edit' ? editor.exerciseIndex : null}
        onClose={() => setEditor(null)}
        onSave={(updated) => {
          if (editor?.mode === 'edit') {
            updateExercise(workout.id, editor.exerciseIndex, updated);
          } else {
            addExercise(workout.id, updated);
          }
          setEditor(null);
        }}
        onDelete={
          editor?.mode === 'edit'
            ? () => {
                removeExercise(workout.id, editor.exerciseIndex);
                setEditor(null);
              }
            : undefined
        }
      />

      <ExerciseNotesModal
        visible={notesEditor != null}
        exerciseName={notesEditor?.exercise.name ?? ''}
        notes={notesEditor?.exercise.notes ?? ''}
        onClose={() => setNotesEditor(null)}
        onSave={(notes) => {
          if (!notesEditor) return;
          updateExercise(workout.id, notesEditor.exerciseIndex, {
            ...notesEditor.exercise,
            notes,
          });
          setNotesEditor(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  headerIcon: {
    minWidth: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 22,
    letterSpacing: -0.3,
    color: theme.colors.onBackground,
  },
  headerSub: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  headerBtnPrimary: {
    fontFamily: theme.fonts.labelBold,
    fontSize: 16,
    color: theme.colors.champagne,
  },
  label: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: theme.fonts.label,
    fontSize: 17,
    color: theme.colors.onBackground,
    borderRadius: 16,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    letterSpacing: -0.3,
    color: theme.colors.onBackground,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.champagne,
  },
  addChipTxt: {
    fontFamily: theme.fonts.labelBold,
    fontSize: 13,
    color: theme.colors.onChampagne,
  },
  hint: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 17,
    marginBottom: 10,
  },
  muted: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 22,
  },
  bigAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.champagne,
    height: 52,
    width: '100%',
    borderRadius: 26,
  },
  bigAddTxt: {
    fontFamily: theme.fonts.labelBold,
    fontSize: 16,
    color: theme.colors.onChampagne,
  },
  supersetBanner: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(235,213,174,0.08)',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(235,213,174,0.3)',
    marginTop: 4,
  },
  supersetBannerTxt: {
    flex: 1,
    fontFamily: theme.fonts.label,
    fontSize: 12,
    letterSpacing: 1,
    color: theme.colors.champagne,
    textTransform: 'uppercase',
  },
  ungroupTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  dragHandle: {
    width: 28,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
  },
  exMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exRowDragging: {
    opacity: 0.96,
    borderColor: 'rgba(235,213,174,0.45)',
    backgroundColor: 'rgba(235,213,174,0.08)',
  },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderRadius: 18,
  },
  exRowSuperset: {
    borderColor: 'rgba(235,213,174,0.3)',
    marginBottom: 0,
    borderRadius: 0,
    borderTopWidth: 0,
  },
  exRowSupersetFirst: {
    borderTopWidth: 0,
  },
  exRowSupersetMid: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  exRowSupersetLast: {
    marginBottom: 8,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
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
  linkUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    marginBottom: 6,
    marginTop: -2,
  },
  linkUpTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    color: theme.colors.champagne,
  },
  exName: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 16,
    color: theme.colors.onBackground,
  },
  exMeta: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  exNotes: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  onboardingBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: theme.colors.background,
  },
  onboardingBtn: {
    backgroundColor: theme.colors.champagne,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 27,
  },
  onboardingBtnTxt: {
    fontFamily: theme.fonts.labelBold,
    fontSize: 16,
    color: theme.colors.onChampagne,
  },
});
