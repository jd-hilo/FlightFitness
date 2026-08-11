import { supabase, supabaseConfigured } from '@/lib/supabase';
import { formatWgerCatalogId } from '@/lib/wgerCatalog';

export type WgerMuscle = {
  id: number;
  name: string;
  name_en: string | null;
  is_front: boolean;
  image_url_main: string | null;
  image_url_secondary: string | null;
};

export type WgerExerciseMuscle = WgerMuscle & {
  is_primary: boolean;
};

export type WgerExerciseSummary = {
  catalogId: string;
  wgerId: number;
  name: string;
  thumbnailUrl: string | null;
};

export type WgerExerciseDetail = WgerExerciseSummary & {
  muscles: WgerExerciseMuscle[];
};

const EXERCISE_DETAIL_SELECT = `
  id,
  name,
  image_thumbnail_url,
  exercise_muscles (
    is_primary,
    muscles (
      id,
      name,
      name_en,
      is_front,
      image_url_main,
      image_url_secondary
    )
  )
`;

type MuscleJoinRow = {
  is_primary: boolean;
  muscles: WgerMuscle | WgerMuscle[] | null;
};

type ExerciseDetailRow = {
  id: number;
  name: string;
  image_thumbnail_url: string | null;
  exercise_muscles: MuscleJoinRow[] | null;
};

function normalizeMuscleJoins(
  rows: MuscleJoinRow[] | null | undefined
): WgerExerciseMuscle[] {
  if (!rows?.length) return [];
  const out: WgerExerciseMuscle[] = [];
  for (const row of rows) {
    const muscle = Array.isArray(row.muscles) ? row.muscles[0] : row.muscles;
    if (!muscle) continue;
    out.push({ ...muscle, is_primary: row.is_primary });
  }
  return out.sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return (a.name_en || a.name).localeCompare(b.name_en || b.name);
  });
}

function mapExerciseDetail(row: ExerciseDetailRow): WgerExerciseDetail {
  return {
    catalogId: formatWgerCatalogId(row.id),
    wgerId: row.id,
    name: row.name,
    thumbnailUrl: row.image_thumbnail_url,
    muscles: normalizeMuscleJoins(row.exercise_muscles),
  };
}

export async function searchWgerExercises(
  query: string,
  limit = 12
): Promise<WgerExerciseSummary[]> {
  if (!supabaseConfigured || !supabase) return [];

  const trimmed = query.trim();
  let request = supabase
    .from('exercises')
    .select('id, name, image_thumbnail_url')
    .order('name', { ascending: true })
    .limit(limit);

  if (trimmed) {
    request = request.ilike('name', `%${trimmed}%`);
  }

  const { data, error } = await request;
  if (error) {
    if (__DEV__) console.warn('[wgerExerciseCatalog] search failed:', error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    catalogId: formatWgerCatalogId(row.id),
    wgerId: row.id,
    name: row.name,
    thumbnailUrl: row.image_thumbnail_url,
  }));
}

export async function fetchWgerExerciseDetails(
  wgerIds: number[]
): Promise<WgerExerciseDetail[]> {
  if (!supabaseConfigured || !supabase || wgerIds.length === 0) return [];

  const { data, error } = await supabase
    .from('exercises')
    .select(EXERCISE_DETAIL_SELECT)
    .in('id', wgerIds);

  if (error) {
    if (__DEV__) console.warn('[wgerExerciseCatalog] fetch details failed:', error.message);
    return [];
  }

  return (data as ExerciseDetailRow[] | null)?.map(mapExerciseDetail) ?? [];
}
