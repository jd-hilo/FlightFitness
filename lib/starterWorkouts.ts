import { defaultSetRow, newId, syncExerciseAggregateFromSetRows } from '@/lib/exerciseNormalize';
import { useWorkoutLibraryStore } from '@/stores/workoutLibraryStore';
import type { Exercise } from '@/types/plan';

export const STARTER_WORKOUTS = [
  {
    id: 'full_body',
    title: 'Full body',
    summary: 'Squat, push-up, row, plank',
  },
  {
    id: 'upper_body',
    title: 'Upper body',
    summary: 'Bench, row, press, pull-up',
  },
  {
    id: 'lower_body',
    title: 'Lower body',
    summary: 'Squat, hinge, lunge, hip thrust',
  },
] as const;

export type StarterWorkoutId = (typeof STARTER_WORKOUTS)[number]['id'];

function makeExercise(
  name: string,
  reps: string,
  restSec: number,
  notes: string,
  catalogExerciseId?: string,
  sets = 3
): Exercise {
  const id = newId('ex');
  const setRows = Array.from({ length: sets }, () => defaultSetRow(reps, restSec));
  return syncExerciseAggregateFromSetRows({
    id,
    name,
    catalogExerciseId,
    sets,
    reps,
    restSec,
    notes,
    setRows,
  });
}

/** Four movements each. Barbell where it helps, bodyweight always listed in the notes. */
export function buildStarterExercises(starterId: StarterWorkoutId): Exercise[] {
  switch (starterId) {
    case 'full_body':
      return [
        makeExercise('Squat', '8', 90, 'Barbell or bodyweight.', 'barbell-back-squat'),
        makeExercise('Push-up', '8-12', 60, 'Knees down is fine.'),
        makeExercise('Row', '8', 90, 'Barbell or an inverted row.', 'barbell-row'),
        makeExercise('Plank', '30 sec', 45, 'Hold a straight line.', 'plank'),
      ];
    case 'upper_body':
      return [
        makeExercise('Bench press', '8', 90, 'Barbell, or push-ups.', 'barbell-bench-press'),
        makeExercise('Row', '8', 90, 'Barbell or an inverted row.', 'barbell-row'),
        makeExercise('Overhead press', '8', 90, 'Barbell, or pike push-ups.', 'overhead-press'),
        makeExercise('Pull-up', '5-8', 90, 'Or inverted rows.', 'pull-up'),
      ];
    case 'lower_body':
      return [
        makeExercise('Squat', '8', 90, 'Barbell or bodyweight.', 'barbell-back-squat'),
        makeExercise(
          'Romanian deadlift',
          '8',
          90,
          'Barbell, or a bodyweight hinge.',
          'romanian-deadlift'
        ),
        makeExercise('Lunge', '8 each', 60, 'Bodyweight or dumbbells.', 'dumbbell-lunge'),
        makeExercise(
          'Hip thrust',
          '10',
          60,
          'Barbell, or a bodyweight glute bridge.',
          'hip-thrust'
        ),
      ];
  }
}

/**
 * Insert the starter if this library does not already have one with the same title.
 * Returns null when the free-tier cap blocks another workout.
 */
export function ensureStarterWorkout(starterId: StarterWorkoutId): string | null {
  const spec = STARTER_WORKOUTS.find((item) => item.id === starterId);
  if (!spec) return null;
  const library = useWorkoutLibraryStore.getState();
  const existing = library.workouts.find(
    (workout) => workout.title === spec.title && workout.exercises.length > 0
  );
  if (existing) return existing.id;
  return library.seedSavedWorkout({
    title: spec.title,
    exercises: buildStarterExercises(starterId),
  });
}
