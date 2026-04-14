import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import type { Exercise, WorkoutDay } from '@/types/plan';

type Props = {
  workout: WorkoutDay;
  completed: boolean;
  exerciseIdsDone: string[];
  onToggleComplete: () => void;
  onToggleExercise: (exerciseId: string) => void;
  onSwapExercise?: (index: number) => void;
  /** Past calendar days: show plan but disable completion / swap. */
  readOnly?: boolean;
};

export function WorkoutBlock({
  workout,
  completed,
  exerciseIdsDone,
  onToggleComplete,
  onToggleExercise,
  onSwapExercise,
  readOnly = false,
}: Props) {
  return (
    <View style={[styles.card, readOnly && styles.cardReadOnly]}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>Training</Text>
          <Text style={[styles.title, readOnly && styles.textMuted]}>{workout.title}</Text>
        </View>
        <Pressable
          onPress={readOnly ? undefined : onToggleComplete}
          disabled={readOnly}
          hitSlop={12}>
          {completed ? (
            <MaterialIcons
              name="check-circle"
              size={36}
              color={readOnly ? theme.colors.onSurfaceVariant : theme.colors.gold}
            />
          ) : (
            <View style={[styles.completeBtn, readOnly && styles.completeBtnDisabled]}>
              <Text style={[styles.completeTxt, readOnly && styles.completeTxtMuted]}>Done</Text>
            </View>
          )}
        </Pressable>
      </View>
      {workout.exercises.map((ex, i) => (
        <ExerciseRow
          key={ex.id}
          exercise={ex}
          done={exerciseIdsDone.includes(ex.id)}
          readOnly={readOnly}
          onToggleCheck={() => onToggleExercise(ex.id)}
          onSwap={!readOnly && onSwapExercise ? () => onSwapExercise(i) : undefined}
        />
      ))}
    </View>
  );
}

function ExerciseRow({
  exercise,
  done,
  readOnly,
  onToggleCheck,
  onSwap,
}: {
  exercise: Exercise;
  done: boolean;
  readOnly?: boolean;
  onToggleCheck: () => void;
  onSwap?: () => void;
}) {
  const iconColor = done
    ? readOnly
      ? theme.colors.onSurfaceVariant
      : theme.colors.gold
    : theme.colors.onSurfaceVariant;
  return (
    <View style={styles.exRow}>
      <Pressable
        onPress={readOnly ? undefined : onToggleCheck}
        disabled={readOnly}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
        style={styles.exCheckHit}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done, disabled: readOnly }}
        accessibilityLabel={`${exercise.name}, ${done ? 'completed' : 'not completed'}`}>
        <MaterialIcons
          name={done ? 'check-circle' : 'radio-button-unchecked'}
          size={24}
          color={iconColor}
        />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={[styles.exName, readOnly && styles.textMuted]}>{exercise.name}</Text>
        <Text style={[styles.exMeta, readOnly && styles.metaMuted]}>
          {exercise.sets} × {exercise.reps} · Rest {exercise.restSec}s
        </Text>
        {exercise.notes ? (
          <Text style={[styles.exNotes, readOnly && styles.metaMuted]}>{exercise.notes}</Text>
        ) : null}
      </View>
      {onSwap ? (
        <Pressable onPress={onSwap} hitSlop={8}>
          <Text style={styles.swap}>Swap</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.outlineStrong,
    padding: 20,
    marginBottom: 16,
  },
  cardReadOnly: {
    opacity: 0.55,
  },
  textMuted: {
    color: theme.colors.onSurfaceVariant,
  },
  metaMuted: {
    opacity: 0.85,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  kicker: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontFamily: theme.fonts.headline,
    fontSize: 22,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  completeBtn: {
    borderWidth: 1,
    borderColor: theme.colors.gold,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  completeBtnDisabled: {
    borderColor: theme.colors.outline,
  },
  completeTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    color: theme.colors.gold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  completeTxtMuted: {
    color: theme.colors.onSurfaceVariant,
  },
  exRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineStrong,
    paddingTop: 14,
    marginTop: 14,
    alignItems: 'flex-start',
    gap: 10,
  },
  exCheckHit: {
    paddingTop: 2,
  },
  exName: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 16,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  exMeta: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  exNotes: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 6,
    fontStyle: 'italic',
  },
  swap: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
});
