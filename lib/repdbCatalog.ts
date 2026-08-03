export const REPDB_CATALOG_PREFIX = 'repdb:';

export function formatRepdbCatalogId(slug: string): string {
  return `${REPDB_CATALOG_PREFIX}${slug}`;
}

export function parseRepdbCatalogId(
  catalogExerciseId: string | undefined
): string | null {
  if (!catalogExerciseId?.startsWith(REPDB_CATALOG_PREFIX)) return null;
  const id = catalogExerciseId.slice(REPDB_CATALOG_PREFIX.length).trim();
  return id.length > 0 ? id : null;
}

export function isRepdbCatalogId(catalogExerciseId: string | undefined): boolean {
  return parseRepdbCatalogId(catalogExerciseId) != null;
}
