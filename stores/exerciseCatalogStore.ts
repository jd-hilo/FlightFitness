import { create } from 'zustand';

import {
  fetchRepdbDetailsByCatalogIds,
  searchRepdbExercises,
  type RepdbExerciseSummary,
} from '@/lib/api/repdbExerciseCatalog';
import { isRepdbCatalogId } from '@/lib/repdbCatalog';

export type ExerciseCatalogSearchResult = {
  source: 'repdb';
  id: string;
  name: string;
  /** Metro require() module for the WebP still */
  imageModule: number | null;
  /** @deprecated URI thumbs — unused for RepDB; kept for call-site compat */
  thumbnailUrl: string | null;
};

type CatalogSummary = {
  catalogId: string;
  name: string;
  imageModule: number | null;
};

type ExerciseCatalogState = {
  summariesById: Record<string, CatalogSummary>;
  searchResults: ExerciseCatalogSearchResult[];
  searchLoading: boolean;
  searchExercises: (query: string) => Promise<void>;
  prefetchExerciseDetails: (catalogIds: string[]) => Promise<void>;
  getImageModule: (catalogId?: string) => number | null;
  getThumbnailUrl: (catalogId?: string) => string | null;
};

function mapSummary(entry: RepdbExerciseSummary): ExerciseCatalogSearchResult {
  return {
    source: 'repdb',
    id: entry.catalogId,
    name: entry.name,
    imageModule: entry.imageModule,
    thumbnailUrl: null,
  };
}

function toCatalogSummary(entry: RepdbExerciseSummary): CatalogSummary {
  return {
    catalogId: entry.catalogId,
    name: entry.name,
    imageModule: entry.imageModule,
  };
}

export const useExerciseCatalogStore = create<ExerciseCatalogState>((set, get) => ({
  summariesById: {},
  searchResults: [],
  searchLoading: false,

  searchExercises: async (query) => {
    set({ searchLoading: true });
    try {
      const rows = searchRepdbExercises(query);
      const summariesById = { ...get().summariesById };
      for (const entry of rows) {
        summariesById[entry.catalogId] = toCatalogSummary(entry);
      }
      set({
        summariesById,
        searchResults: rows.map(mapSummary),
        searchLoading: false,
      });
    } catch {
      set({ searchLoading: false, searchResults: [] });
    }
  },

  prefetchExerciseDetails: async (catalogIds) => {
    const repdbIds = catalogIds.filter(isRepdbCatalogId);
    const missing = repdbIds.filter((id) => !get().summariesById[id]?.imageModule);
    if (missing.length === 0) return;
    const details = fetchRepdbDetailsByCatalogIds(missing);
    if (!details.length) return;
    set((state) => {
      const summariesById = { ...state.summariesById };
      for (const detail of details) {
        summariesById[detail.catalogId] = toCatalogSummary(detail);
      }
      return { summariesById };
    });
  },

  getImageModule: (catalogId) => {
    if (!catalogId || !isRepdbCatalogId(catalogId)) return null;
    return get().summariesById[catalogId]?.imageModule ?? null;
  },

  getThumbnailUrl: () => null,
}));
