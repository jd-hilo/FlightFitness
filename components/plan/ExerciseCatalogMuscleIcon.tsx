import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { ExerciseIcon } from '@/components/plan/ExerciseIcon';
import { RemoteSvg } from '@/components/plan/RemoteSvg';
import type { WgerExerciseMuscle } from '@/lib/api/wgerExerciseCatalog';
import { isWgerCatalogId } from '@/lib/wgerCatalog';
import { useExerciseCatalogStore } from '@/stores/exerciseCatalogStore';

const EMPTY_MUSCLES: WgerExerciseMuscle[] = [];

type Props = {
  catalogExerciseId: string;
  size?: number;
};

export function ExerciseCatalogMuscleIcon({ catalogExerciseId, size = 44 }: Props) {
  const muscles = useExerciseCatalogStore((s) =>
    isWgerCatalogId(catalogExerciseId)
      ? s.musclesByCatalogId[catalogExerciseId] ?? EMPTY_MUSCLES
      : EMPTY_MUSCLES
  );
  const prefetchExerciseDetails = useExerciseCatalogStore((s) => s.prefetchExerciseDetails);

  useEffect(() => {
    if (!isWgerCatalogId(catalogExerciseId)) return;
    void prefetchExerciseDetails([catalogExerciseId]);
  }, [catalogExerciseId, prefetchExerciseDetails]);

  const primary = muscles.find((m) => m.is_primary) ?? muscles[0];
  const uri = primary?.image_url_main ?? primary?.image_url_secondary;

  if (uri) {
    return (
      <View style={[styles.wrap, { width: size, height: size }]}>
        <RemoteSvg uri={uri} width={size} height={size} />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <ExerciseIcon catalogExerciseId={catalogExerciseId} size={Math.round(size * 0.45)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
