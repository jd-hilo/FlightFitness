import { useEffect, useMemo } from 'react';

import { isRepdbCatalogId } from '@/lib/repdbCatalog';
import { useExerciseCatalogStore } from '@/stores/exerciseCatalogStore';

/** Warm RepDB stills for exercises in a workout (local — no network). */
export function usePrefetchWorkoutExerciseMuscles(
  catalogExerciseIds: (string | undefined)[]
) {
  const prefetchExerciseDetails = useExerciseCatalogStore((s) => s.prefetchExerciseDetails);
  const key = useMemo(
    () =>
      catalogExerciseIds
        .filter((id): id is string => Boolean(id) && isRepdbCatalogId(id))
        .sort()
        .join(','),
    [catalogExerciseIds]
  );

  useEffect(() => {
    if (!key) return;
    void prefetchExerciseDetails(key.split(','));
  }, [key, prefetchExerciseDetails]);
}
