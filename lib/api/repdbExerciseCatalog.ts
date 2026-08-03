import exercisesBundle from '@/assets/repdb/exercises.json';
import {
  formatRepdbCatalogId,
  parseRepdbCatalogId,
} from '@/lib/repdbCatalog';
import {
  getRepdbFlatImage,
  type RepdbImageVariant,
} from '@/lib/repdbImages';

export const REPDB_SEARCH_LIMIT = 24;

type RepdbFlatVariants = RepdbImageVariant[];

type RepdbExerciseRaw = {
  id: string;
  name: string;
  description?: string;
  instructions?: string[];
  tips?: string[];
  category?: string;
  equipment?: string;
  body_part?: string;
  primary_muscles?: string[];
  secondary_muscles?: string[];
  images?: { flat?: RepdbFlatVariants };
};

type RepdbBundle = {
  exercises: RepdbExerciseRaw[];
};

const bundle = exercisesBundle as RepdbBundle;
const ALL: RepdbExerciseRaw[] = Array.isArray(bundle.exercises)
  ? bundle.exercises
  : [];

export type RepdbExerciseSummary = {
  catalogId: string;
  slug: string;
  name: string;
  /** Metro require() module id for the preferred still */
  imageModule: number | null;
  bodyPart?: string;
  equipment?: string;
  instructions: string[];
};

function preferredVariant(flat: RepdbFlatVariants | undefined): RepdbImageVariant | null {
  if (!flat?.length) return null;
  for (const v of ['peak', 'start', 'main'] as const) {
    if (flat.includes(v)) return v;
  }
  return flat[0] ?? null;
}

function resolveImageModule(slug: string, flat: RepdbFlatVariants | undefined): number | null {
  const order: RepdbImageVariant[] = [];
  const preferred = preferredVariant(flat);
  if (preferred) order.push(preferred);
  for (const v of ['peak', 'start', 'main'] as const) {
    if (!order.includes(v)) order.push(v);
  }
  for (const v of order) {
    const mod = getRepdbFlatImage(slug, v);
    if (mod != null) return mod;
  }
  return null;
}

function mapExercise(row: RepdbExerciseRaw): RepdbExerciseSummary | null {
  const imageModule = resolveImageModule(row.id, row.images?.flat);
  if (imageModule == null) return null; // only show exercises with bundled images
  return {
    catalogId: formatRepdbCatalogId(row.id),
    slug: row.id,
    name: row.name,
    imageModule,
    bodyPart: row.body_part,
    equipment: row.equipment,
    instructions: row.instructions ?? [],
  };
}

const INDEX: RepdbExerciseSummary[] = ALL.map(mapExercise).filter(
  (row): row is RepdbExerciseSummary => row != null
);

const BY_CATALOG_ID = new Map(INDEX.map((row) => [row.catalogId, row]));

export function getRepdbExerciseByCatalogId(
  catalogId: string | undefined
): RepdbExerciseSummary | null {
  if (!catalogId) return null;
  return BY_CATALOG_ID.get(catalogId) ?? null;
}

export function getRepdbImageModule(
  catalogId: string | undefined
): number | null {
  return getRepdbExerciseByCatalogId(catalogId)?.imageModule ?? null;
}

/** Local search — no network. Only exercises with images. */
export function searchRepdbExercises(
  query: string,
  limit = REPDB_SEARCH_LIMIT
): RepdbExerciseSummary[] {
  const capped = Math.min(Math.max(1, limit), 60);
  const q = query.trim().toLowerCase();
  if (!q) return INDEX.slice(0, capped);

  const scored: { row: RepdbExerciseSummary; score: number }[] = [];
  for (const row of INDEX) {
    const name = row.name.toLowerCase();
    const slug = row.slug.toLowerCase();
    let score = 0;
    if (name === q || slug === q) score = 100;
    else if (name.startsWith(q) || slug.startsWith(q)) score = 80;
    else if (name.includes(q) || slug.includes(q)) score = 50;
    else if (row.bodyPart?.toLowerCase().includes(q)) score = 20;
    else if (row.equipment?.toLowerCase().includes(q)) score = 15;
    if (score > 0) scored.push({ row, score });
  }
  scored.sort((a, b) => b.score - a.score || a.row.name.localeCompare(b.row.name));
  return scored.slice(0, capped).map((s) => s.row);
}

export function fetchRepdbDetailsByCatalogIds(
  catalogIds: string[]
): RepdbExerciseSummary[] {
  return catalogIds
    .map((id) => {
      const slug = parseRepdbCatalogId(id);
      if (!slug) return null;
      return BY_CATALOG_ID.get(formatRepdbCatalogId(slug)) ?? null;
    })
    .filter((row): row is RepdbExerciseSummary => row != null);
}

export function repdbCatalogSize(): number {
  return INDEX.length;
}
