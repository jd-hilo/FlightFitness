import { create } from 'zustand';

import {
  fetchDailyContent,
  fetchDailyContentRaw,
  prefetchDailyHeroImage,
  type DailyContent,
  type DailyContentFetchResult,
} from '@/lib/api/dailyContent';

type DailyContentState = {
  content: DailyContent | null;
  loading: boolean;
  /** After first daily fetch for the session (or same-day cache hit); avoids flashing bundled hero before remote. */
  dailyFetchSettled: boolean;
  load: () => Promise<void>;
  /** Always hits the Edge Function (ignores same-day cache). */
  invoke: () => Promise<DailyContentFetchResult>;
};

let loadInFlight: Promise<void> | null = null;

/** Avoid hanging the root router on slow or stuck network / image prefetch. */
const DAILY_FETCH_TIMEOUT_MS = 14_000;
const HERO_PREFETCH_TIMEOUT_MS = 10_000;

function raceTimeout<T>(promise: Promise<T>, ms: number, onTimeout: T): Promise<T> {
  return new Promise((resolve) => {
    const id = setTimeout(() => resolve(onTimeout), ms);
    promise
      .then((v) => {
        clearTimeout(id);
        resolve(v);
      })
      .catch(() => {
        clearTimeout(id);
        resolve(onTimeout);
      });
  });
}

export const useDailyContentStore = create<DailyContentState>((set, get) => ({
  content: null,
  loading: false,
  dailyFetchSettled: false,
  load: async () => {
    if (loadInFlight) return loadInFlight;

    const run = (async () => {
      const utcDay = new Date().toISOString().slice(0, 10);
      const existing = get().content;
      if (existing?.day === utcDay) {
        await raceTimeout(
          prefetchDailyHeroImage(existing),
          HERO_PREFETCH_TIMEOUT_MS,
          undefined
        );
        set({ dailyFetchSettled: true });
        return;
      }

      set({ loading: true });
      try {
        const c = await raceTimeout(fetchDailyContent(), DAILY_FETCH_TIMEOUT_MS, null);
        await raceTimeout(
          prefetchDailyHeroImage(c),
          HERO_PREFETCH_TIMEOUT_MS,
          undefined
        );
        set({ content: c });
      } finally {
        set({ loading: false, dailyFetchSettled: true });
      }
    })();

    loadInFlight = run.finally(() => {
      loadInFlight = null;
    });
    return loadInFlight;
  },
  invoke: async () => {
    if (get().loading) {
      return { ok: false, message: 'Already loading.' };
    }
    set({ loading: true });
    try {
      const r = await raceTimeout(
        fetchDailyContentRaw(),
        DAILY_FETCH_TIMEOUT_MS,
        { ok: false as const, message: 'Daily content request timed out.' }
      );
      if (r.ok) {
        await raceTimeout(
          prefetchDailyHeroImage(r.data),
          HERO_PREFETCH_TIMEOUT_MS,
          undefined
        );
        set({ content: r.data });
      }
      return r;
    } finally {
      set({ loading: false, dailyFetchSettled: true });
    }
  },
}));
