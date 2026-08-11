import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  fetchDailyContent,
  fetchDailyContentRaw,
  prefetchDailyHeroImage,
  type DailyContent,
  type DailyContentFetchResult,
} from '@/lib/api/dailyContent';
import { resolveDailyVerse } from '@/lib/dailyVerse';
import { prefetchVersePassage } from '@/lib/versePassageCache';

type DailyContentState = {
  content: DailyContent | null;
  loading: boolean;
  /** After first daily fetch for the session (or same-day cache hit); avoids flashing bundled hero before remote. */
  dailyFetchSettled: boolean;
  load: () => Promise<void>;
  /** Always hits the Edge Function (ignores same-day cache). */
  invoke: () => Promise<DailyContentFetchResult>;
  reset: () => void;
};

let loadInFlight: Promise<void> | null = null;

/** Avoid hanging background work on slow or stuck network. */
const DAILY_FETCH_TIMEOUT_MS = 14_000;
const HERO_PREFETCH_TIMEOUT_MS = 10_000;

function utcDayNow(): string {
  return new Date().toISOString().slice(0, 10);
}

function prefetchHeroInBackground(content: DailyContent | null) {
  void raceTimeout(
    prefetchDailyHeroImage(content),
    HERO_PREFETCH_TIMEOUT_MS,
    undefined
  );
}

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

function settleFromCachedContent(content: DailyContent | null): boolean {
  if (!content || content.day !== utcDayNow()) return false;
  prefetchVersePassage(resolveDailyVerse(content));
  prefetchHeroInBackground(content);
  return true;
}

export const useDailyContentStore = create<DailyContentState>()(
  persist(
    (set, get) => ({
      content: null,
      loading: false,
      dailyFetchSettled: false,
      load: async () => {
        if (loadInFlight) return loadInFlight;

        const run = (async () => {
          const existing = get().content;
          if (settleFromCachedContent(existing)) {
            set({ dailyFetchSettled: true });
            return;
          }

          set({ loading: true });
          try {
            const c = await raceTimeout(fetchDailyContent(), DAILY_FETCH_TIMEOUT_MS, null);
            set({ content: c });
            prefetchVersePassage(resolveDailyVerse(c));
            prefetchHeroInBackground(c);
          } finally {
            prefetchVersePassage(resolveDailyVerse(get().content));
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
            set({ content: r.data });
            prefetchVersePassage(resolveDailyVerse(r.data));
            prefetchHeroInBackground(r.data);
          }
          return r;
        } finally {
          set({ loading: false, dailyFetchSettled: true });
        }
      },
      reset: () =>
        set({
          content: null,
          loading: false,
          dailyFetchSettled: false,
        }),
    }),
    {
      name: 'flight-daily-content',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ content: s.content }),
      onRehydrateStorage: () => (state) => {
        if (!state?.content || state.content.day !== utcDayNow()) return;
        // Defer so persist has finished merging before we mark settled + warm caches.
        queueMicrotask(() => {
          const current = useDailyContentStore.getState().content;
          if (settleFromCachedContent(current)) {
            useDailyContentStore.setState({ dailyFetchSettled: true });
          }
        });
      },
    }
  )
);
