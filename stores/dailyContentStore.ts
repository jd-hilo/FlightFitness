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
        await prefetchDailyHeroImage(existing);
        set({ dailyFetchSettled: true });
        return;
      }

      set({ loading: true });
      try {
        const c = await fetchDailyContent();
        await prefetchDailyHeroImage(c);
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
      const r = await fetchDailyContentRaw();
      if (r.ok) {
        await prefetchDailyHeroImage(r.data);
        set({ content: r.data });
      }
      return r;
    } finally {
      set({ loading: false, dailyFetchSettled: true });
    }
  },
}));
