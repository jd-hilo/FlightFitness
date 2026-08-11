import {
  formatWorkoutXCatalogId,
  parseWorkoutXCatalogId,
} from '@/lib/workoutxCatalog';

const WORKOUTX_BASE = 'https://api.workoutxapp.com/v1';

/** Free plan caps list pages at 10; keep searches within that. */
export const WORKOUTX_SEARCH_LIMIT = 10;

export type WorkoutXExerciseSummary = {
  catalogId: string;
  workoutxId: string;
  name: string;
  thumbnailUrl: string | null;
  bodyPart?: string;
  equipment?: string;
  target?: string;
};

export type WorkoutXExerciseDetail = WorkoutXExerciseSummary & {
  instructions: string[];
  secondaryMuscles: string[];
  description?: string;
};

type WorkoutXApiExercise = {
  id: string;
  name: string;
  bodyPart?: string;
  equipment?: string;
  target?: string;
  secondaryMuscles?: string[];
  instructions?: string[];
  gifUrl?: string;
  description?: string;
};

type WorkoutXListResponse = {
  total?: number;
  count?: number;
  data?: WorkoutXApiExercise[];
};

function workoutXApiKey(): string {
  return (process.env.EXPO_PUBLIC_WORKOUTX_API_KEY ?? '').trim();
}

export function isWorkoutXConfigured(): boolean {
  return workoutXApiKey().length > 0;
}

/** GIFs require auth; RN Image can't set headers, so append documented query param. */
export function authenticatedWorkoutXGifUrl(gifUrl: string | null | undefined): string | null {
  if (!gifUrl) return null;
  const key = workoutXApiKey();
  if (!key) return null;
  try {
    const url = new URL(gifUrl);
    if (!url.searchParams.has('api-key')) {
      url.searchParams.set('api-key', key);
    }
    return url.toString();
  } catch {
    const sep = gifUrl.includes('?') ? '&' : '?';
    return `${gifUrl}${sep}api-key=${encodeURIComponent(key)}`;
  }
}

function mapExercise(row: WorkoutXApiExercise): WorkoutXExerciseDetail {
  return {
    catalogId: formatWorkoutXCatalogId(row.id),
    workoutxId: row.id,
    name: row.name,
    thumbnailUrl: authenticatedWorkoutXGifUrl(row.gifUrl),
    bodyPart: row.bodyPart,
    equipment: row.equipment,
    target: row.target,
    instructions: row.instructions ?? [],
    secondaryMuscles: row.secondaryMuscles ?? [],
    description: row.description,
  };
}

async function workoutXFetch(path: string): Promise<Response | null> {
  const key = workoutXApiKey();
  if (!key) return null;
  try {
    return await fetch(`${WORKOUTX_BASE}${path}`, {
      headers: {
        Accept: 'application/json',
        'X-WorkoutX-Key': key,
      },
    });
  } catch (error) {
    if (__DEV__) console.warn('[workoutx] network error:', error);
    return null;
  }
}

function unwrapList(payload: unknown): WorkoutXApiExercise[] {
  if (Array.isArray(payload)) return payload as WorkoutXApiExercise[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as WorkoutXListResponse).data)) {
    return (payload as WorkoutXListResponse).data ?? [];
  }
  return [];
}

function hasGif(row: WorkoutXApiExercise): boolean {
  return Boolean(row.gifUrl?.trim());
}

/** Only return exercises that have a WorkoutX GIF (image consistency). */
export async function searchWorkoutXExercises(
  query: string,
  limit = WORKOUTX_SEARCH_LIMIT
): Promise<WorkoutXExerciseSummary[]> {
  if (!isWorkoutXConfigured()) return [];

  const trimmed = query.trim();
  const capped = Math.min(Math.max(1, limit), WORKOUTX_SEARCH_LIMIT);
  const pageSize = WORKOUTX_SEARCH_LIMIT;
  const withImages: WorkoutXExerciseSummary[] = [];

  if (trimmed) {
    const res = await workoutXFetch(
      `/exercises/name/${encodeURIComponent(trimmed)}?limit=${pageSize}`
    );
    if (!res) return [];
    if (!res.ok) {
      if (__DEV__) console.warn('[workoutx] search failed:', res.status);
      return [];
    }
    const json: unknown = await res.json();
    for (const row of unwrapList(json)) {
      if (!hasGif(row)) continue;
      withImages.push(mapExercise(row));
      if (withImages.length >= capped) break;
    }
    return withImages;
  }

  // Browse: page until we have enough imaged exercises (free plan = 10/page).
  const maxPages = 5;
  for (let page = 0; page < maxPages && withImages.length < capped; page++) {
    const offset = page * pageSize;
    const res = await workoutXFetch(`/exercises?limit=${pageSize}&offset=${offset}`);
    if (!res) break;
    if (!res.ok) {
      if (__DEV__) console.warn('[workoutx] list failed:', res.status);
      break;
    }
    const rows = unwrapList(await res.json());
    if (rows.length === 0) break;
    for (const row of rows) {
      if (!hasGif(row)) continue;
      withImages.push(mapExercise(row));
      if (withImages.length >= capped) break;
    }
    if (rows.length < pageSize) break;
  }

  return withImages.slice(0, capped);
}

export async function fetchWorkoutXExerciseDetails(
  workoutxIds: string[]
): Promise<WorkoutXExerciseDetail[]> {
  if (!isWorkoutXConfigured() || workoutxIds.length === 0) return [];

  const unique = [...new Set(workoutxIds.map((id) => id.trim()).filter(Boolean))];
  const results = await Promise.all(
    unique.map(async (id) => {
      const res = await workoutXFetch(`/exercises/exercise/${encodeURIComponent(id)}`);
      if (!res?.ok) return null;
      const json = (await res.json()) as WorkoutXApiExercise;
      if (!json?.id) return null;
      return mapExercise(json);
    })
  );

  return results.filter((row): row is WorkoutXExerciseDetail => row != null);
}

export async function fetchWorkoutXDetailsByCatalogIds(
  catalogIds: string[]
): Promise<WorkoutXExerciseDetail[]> {
  const ids = catalogIds
    .map((id) => parseWorkoutXCatalogId(id))
    .filter((id): id is string => id != null);
  return fetchWorkoutXExerciseDetails(ids);
}
