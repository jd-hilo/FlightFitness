import { StyleSheet, View } from 'react-native';

import { ExerciseIcon } from '@/components/plan/ExerciseIcon';

type Props = {
  catalogExerciseId: string;
  size?: number;
};

/** WorkoutX GIF / fallback icon — wger muscle diagrams removed for image consistency. */
export function ExerciseCatalogMuscleIcon({ catalogExerciseId, size = 44 }: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <ExerciseIcon catalogExerciseId={catalogExerciseId} size={Math.round(size * 0.55)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
