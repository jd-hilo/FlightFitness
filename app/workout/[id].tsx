import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { theme } from '@/constants/theme';
import { ensureExerciseSetRows } from '@/lib/exerciseNormalize';
import { useWorkoutLibraryStore } from '@/stores/workoutLibraryStore';
import type { Exercise } from '@/types/plan';

type EditorState =
  | { mode: 'add' }
  | { mode: 'edit'; exerciseIndex: number; exercise: Exercise };

export default function WorkoutDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const workouts = useWorkoutLibraryStore((s) => s.workouts);
  const updateWorkoutTitle = useWorkoutLibraryStore((s) => s.updateWorkoutTitle);
  const addExercise = useWorkoutLibraryStore((s) => s.addExercise);
  const updateExercise = useWorkoutLibraryStore((s) => s.updateExercise);
  const removeExercise = useWorkoutLibraryStore((s) => s.removeExercise);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [titleDraft, setTitleDraft] = useState('');

  const workout = useMemo(
    () => workouts.find((w) => w.id === id) ?? null,
    [workouts, id]
  );

  useEffect(() => {
    if (workout) setTitleDraft(workout.title);
  }, [workout?.id, workout?.title]);

  useEffect(() => {
    if (id && !workout && workouts.length >= 0) {
      router.replace('/(tabs)/train');
    }
  }, [id, workout, workouts.length]);

  const leave = useCallback(() => {
    if (id && titleDraft.trim()) {
      updateWorkoutTitle(id, titleDraft.trim());
    }
    router.back();
  }, [id, titleDraft, updateWorkoutTitle]);

  if (!workout) return null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={leave} hitSlop={12}>
          <Text style={styles.headerBtn}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Edit workout</Text>
        <Pressable onPress={leave} hitSlop={12}>
          <Text style={styles.headerBtnPrimary}>Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}>
        <Text style={styles.label}>Workout name</Text>
        <TextInput
          style={styles.input}
          value={titleDraft}
          onChangeText={setTitleDraft}
          onBlur={() => {
            if (titleDraft.trim()) updateWorkoutTitle(workout.id, titleDraft.trim());
          }}
        />

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Exercises</Text>
          <Pressable onPress={() => setEditor({ mode: 'add' })}>
            <Text style={styles.link}>Add</Text>
          </Pressable>
        </View>

        {workout.exercises.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.muted}>Add exercises before you begin this workout.</Text>
            <Pressable style={styles.bigAddBtn} onPress={() => setEditor({ mode: 'add' })}>
              <MaterialIcons name="add" size={28} color={theme.colors.background} />
              <Text style={styles.bigAddTxt}>Add exercise</Text>
            </Pressable>
          </View>
        ) : null}

        {workout.exercises.map((exercise, index) => {
          const normalized = ensureExerciseSetRows(exercise);
          return (
            <Pressable
              key={exercise.id}
              style={styles.exRow}
              onPress={() => setEditor({ mode: 'edit', exerciseIndex: index, exercise })}>
              <ExerciseIcon catalogExerciseId={normalized.catalogExerciseId} />
              <View style={{ flex: 1 }}>
                <Text style={styles.exName}>{normalized.name}</Text>
                <Text style={styles.exMeta}>
                  {normalized.sets} sets · {normalized.reps}
                </Text>
              </View>
              <Text style={styles.link}>Edit</Text>
            </Pressable>
          );
        })}
      </ScrollView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  headerTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 14,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  headerBtn: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  headerBtnPrimary: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    color: theme.colors.gold,
    letterSpacing: 1,
  },
  label: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 14,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.colors.onBackground,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: theme.fonts.headline,
    fontSize: 20,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  link: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    color: theme.colors.gold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  muted: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.colors.outlineStrong,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  bigAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: theme.colors.gold,
    paddingVertical: 18,
    paddingHorizontal: 32,
    width: '100%',
  },
  bigAddTxt: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 16,
    color: theme.colors.background,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.outlineStrong,
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 14,
    marginBottom: 8,
  },
  exName: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 15,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  exMeta: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
});
