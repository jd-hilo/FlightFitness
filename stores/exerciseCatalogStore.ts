import { create } from 'zustand';

import {
  fetchWgerExerciseDetails,
  searchWgerExercises,
  type WgerExerciseDetail,
  type WgerExerciseMuscle,
  type WgerExerciseSummary,
} from '@/lib/api/wgerExerciseCatalog';
import { isWgerCatalogId, parseWgerCatalogId } from '@/lib/wgerCatalog';

export type ExerciseCatalogSearchResult = {
  source: 'wger';
  id: string;
  name: string;
  thumbnailUrl: string | null;
};

type ExerciseCatalogState = {
  summariesById: Record<string, WgerExerciseSummary>;
  musclesByCatalogId: Record<string, WgerExerciseMuscle[]>;
  searchResults: ExerciseCatalogSearchResult[];
  searchLoading: boolean;
  searchExercises: (query: string) => Promise<void>;
  prefetchExerciseDetails: (catalogIds: string[]) => Promise<void>;
  getThumbnailUrl: (catalogId?: string) => string | null;
  getMuscles: (catalogId?: string) => WgerExerciseMuscle[];
};

function mapWgerSummary(entry: WgerExerciseSummary): ExerciseCatalogSearchResult {
  return {
    source: 'wger',
    id: entry.catalogId,
    name: entry.name,
    thumbnailUrl: entry.thumbnailUrl,
  };
}

function mergeSearchResults(wger: WgerExerciseSummary[]): ExerciseCatalogSearchResult[] {
  return wger.map(mapWgerSummary).slice(0, 24);
}

function applyDetailsToState(
  details: WgerExerciseDetail[]
): Pick<ExerciseCatalogState, 'summariesById' | 'musclesByCatalogId'> {
  const summariesById: Record<string, WgerExerciseSummary> = {};
  const musclesByCatalogId: Record<string, WgerExerciseMuscle[]> = {};

  for (const detail of details) {
    summariesById[detail.catalogId] = {
      catalogId: detail.catalogId,
      wgerId: detail.wgerId,
      name: detail.name,
      thumbnailUrl: detail.thumbnailUrl,
    };
    musclesByCatalogId[detail.catalogId] = detail.muscles;
  }

  return { summariesById, musclesByCatalogId };
}

export const useExerciseCatalogStore = create<ExerciseCatalogState>((set, get) => ({
  summariesById: {},
  musclesByCatalogId: {},
  searchResults: [],
  searchLoading: false,

  searchExercises: async (query) => {
    set({ searchLoading: true });
    try {
      const wger = await searchWgerExercises(query, 24);
      const summariesById = { ...get().summariesById };
      for (const entry of wger) {
        summariesById[entry.catalogId] = entry;
      }
      set({
        summariesById,
        searchResults: mergeSearchResults(wger),
        searchLoading: false,
      });
    } catch {
      set({ searchLoading: false });
    }
  },

  prefetchExerciseDetails: async (catalogIds) => {
    const wgerIds = catalogIds
      .map((id) => parseWgerCatalogId(id))
      .filter((id): id is number => id != null);
    if (wgerIds.length === 0) return;

    const missing = wgerIds.filter((id) => {
      const catalogId = `wger:${id}`;
      const hasMuscles = Boolean(get().musclesByCatalogId[catalogId]?.length);
      const hasThumbnail = Boolean(get().summariesById[catalogId]?.thumbnailUrl);
      return !hasMuscles || !hasThumbnail;
    });
    if (missing.length === 0) return;

    const details = await fetchWgerExerciseDetails(missing);
    if (!details.length) return;

    const patch = applyDetailsToState(details);
    set((state) => ({
      summariesById: { ...state.summariesById, ...patch.summariesById },
      musclesByCatalogId: { ...state.musclesByCatalogId, ...patch.musclesByCatalogId },
    }));
  },

  getThumbnailUrl: (catalogId) => {
    if (!catalogId || !isWgerCatalogId(catalogId)) return null;
    return get().summariesById[catalogId]?.thumbnailUrl ?? null;
  },

  getMuscles: (catalogId) => {
    if (!catalogId || !isWgerCatalogId(catalogId)) return [];
    return get().musclesByCatalogId[catalogId] ?? [];
  },
}));
