import { useEffect, useMemo } from 'react';

import { isWgerCatalogId } from '@/lib/wgerCatalog';
import { useExerciseCatalogStore } from '@/stores/exerciseCatalogStore';

export function usePrefetchWorkoutExerciseMuscles(
  catalogExerciseIds: (string | undefined)[]
) {
  const prefetchExerciseDetails = useExerciseCatalogStore((s) => s.prefetchExerciseDetails);
  const key = useMemo(
    () =>
      catalogExerciseIds
        .filter((id): id is string => Boolean(id) && isWgerCatalogId(id))
        .sort()
        .join(','),
    [catalogExerciseIds]
  );

  useEffect(() => {
    if (!key) return;
    void prefetchExerciseDetails(key.split(','));
  }, [key, prefetchExerciseDetails]);
}
