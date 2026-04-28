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
  /** Open editor for this exercise index (Fuel-style local edit). */
  onEditExercise?: (index: number) => void;
  /** Past calendar days: show plan but disable completion / edit. */
  readOnly?: boolean;
  /** Tighter layout for welcome / marketing slides. */
  compact?: boolean;
};

export function WorkoutBlock({
  workout,
  completed,
  exerciseIdsDone,
  onToggleComplete,
  onToggleExercise,
  onEditExercise,
  readOnly = false,
  compact = false,
}: Props) {
  const doneIconSize = compact ? 22 : 36;
  const rowIconSize = compact ? 17 : 24;

  return (
    <View style={[styles.card, readOnly && styles.cardReadOnly, compact && styles.cardCompact]}>
      <View style={[styles.head, compact && styles.headCompact]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, compact && styles.kickerCompact]}>Training</Text>
          <Text
            style={[
              styles.title,
              compact && styles.titleCompact,
              readOnly && styles.textMuted,
            ]}>
            {workout.title}
          </Text>
        </View>
        <Pressable
          onPress={readOnly ? undefined : onToggleComplete}
          disabled={readOnly}
          hitSlop={12}>
          {completed ? (
            <MaterialIcons
              name="check-circle"
              size={doneIconSize}
              color={readOnly ? theme.colors.onSurfaceVariant : theme.colors.gold}
            />
          ) : (
            <View
              style={[
                styles.completeBtn,
                compact && styles.completeBtnCompact,
                readOnly && styles.completeBtnDisabled,
              ]}>
              <Text
                style={[
                  styles.completeTxt,
                  compact && styles.completeTxtCompact,
                  readOnly && styles.completeTxtMuted,
                ]}>
                Done
              </Text>
            </View>
          )}
        </Pressable>
      </View>
      {workout.exercises.map((ex, i) => (
        <ExerciseRow
          key={ex.id}
          compact={compact}
          rowIconSize={rowIconSize}
          exercise={ex}
          done={exerciseIdsDone.includes(ex.id)}
          readOnly={readOnly}
          onToggleCheck={() => onToggleExercise(ex.id)}
          onEdit={
            !readOnly && onEditExercise ? () => onEditExercise(i) : undefined
          }
        />
      ))}
    </View>
  );
}

function ExerciseRow({
  compact,
  rowIconSize,
  exercise,
  done,
  readOnly,
  onToggleCheck,
  onEdit,
}: {
  compact: boolean;
  rowIconSize: number;
  exercise: Exercise;
  done: boolean;
  readOnly?: boolean;
  onToggleCheck: () => void;
  onEdit?: () => void;
}) {
  const canEdit = onEdit && !readOnly;
  const iconColor = done
    ? readOnly
      ? theme.colors.onSurfaceVariant
      : theme.colors.gold
    : theme.colors.onSurfaceVariant;
  return (
    <View style={[styles.exRow, compact && styles.exRowCompact]}>
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
          size={rowIconSize}
          color={iconColor}
        />
      </Pressable>
      <View style={{ flex: 1 }}>
        <View style={styles.exTitleRow}>
          <Text
            style={[
              styles.exName,
              compact && styles.exNameCompact,
              readOnly && styles.textMuted,
            ]}
            numberOfLines={3}>
            {exercise.name}
          </Text>
          {canEdit ? (
            <Pressable onPress={onEdit} hitSlop={8}>
              <Text style={[styles.editLink, compact && styles.editLinkCompact]}>
                Edit
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={[styles.exMeta, compact && styles.exMetaCompact, readOnly && styles.metaMuted]}>
          {exercise.sets} × {exercise.reps} · Rest {exercise.restSec}s
        </Text>
        {exercise.notes ? (
          <Text
            style={[styles.exNotes, compact && styles.exNotesCompact, readOnly && styles.metaMuted]}>
            {exercise.notes}
          </Text>
        ) : null}
      </View>
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
  exTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 2,
  },
  exName: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 16,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    flex: 1,
    flexShrink: 1,
  },
  editLink: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  cardCompact: {
    padding: 8,
    marginBottom: 6,
  },
  headCompact: {
    marginBottom: 8,
    gap: 6,
  },
  kickerCompact: {
    fontSize: 8,
    marginBottom: 1,
    letterSpacing: 1.5,
  },
  titleCompact: {
    fontSize: 14,
  },
  completeBtnCompact: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  completeTxtCompact: {
    fontSize: 8,
    letterSpacing: 0.5,
  },
  exRowCompact: {
    paddingTop: 8,
    marginTop: 8,
    gap: 6,
  },
  exNameCompact: {
    fontSize: 11,
  },
  exMetaCompact: {
    fontSize: 10,
    marginTop: 1,
  },
  exNotesCompact: {
    fontSize: 10,
    marginTop: 3,
  },
  editLinkCompact: {
    fontSize: 8,
    letterSpacing: 0.5,
  },
});
