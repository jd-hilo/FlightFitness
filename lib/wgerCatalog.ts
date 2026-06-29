export const WGER_CATALOG_PREFIX = 'wger:';

export function formatWgerCatalogId(wgerId: number): string {
  return `${WGER_CATALOG_PREFIX}${wgerId}`;
}

export function parseWgerCatalogId(
  catalogExerciseId: string | undefined
): number | null {
  if (!catalogExerciseId?.startsWith(WGER_CATALOG_PREFIX)) return null;
  const id = Number.parseInt(catalogExerciseId.slice(WGER_CATALOG_PREFIX.length), 10);
  return Number.isFinite(id) ? id : null;
}

export function isWgerCatalogId(catalogExerciseId: string | undefined): boolean {
  return parseWgerCatalogId(catalogExerciseId) != null;
}
