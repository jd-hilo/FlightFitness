export const WORKOUTX_CATALOG_PREFIX = 'workoutx:';

export function formatWorkoutXCatalogId(workoutxId: string): string {
  return `${WORKOUTX_CATALOG_PREFIX}${workoutxId}`;
}

export function parseWorkoutXCatalogId(
  catalogExerciseId: string | undefined
): string | null {
  if (!catalogExerciseId?.startsWith(WORKOUTX_CATALOG_PREFIX)) return null;
  const id = catalogExerciseId.slice(WORKOUTX_CATALOG_PREFIX.length).trim();
  return id.length > 0 ? id : null;
}

export function isWorkoutXCatalogId(catalogExerciseId: string | undefined): boolean {
  return parseWorkoutXCatalogId(catalogExerciseId) != null;
}
