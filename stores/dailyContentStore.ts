import { create } from 'zustand';

import { fetchDailyContent, type DailyContent } from '@/lib/api/dailyContent';

type DailyContentState = {
  content: DailyContent | null;
  loading: boolean;
  load: () => Promise<void>;
};

export const useDailyContentStore = create<DailyContentState>((set, get) => ({
  content: null,
  loading: false,
  load: async () => {
    if (get().loading) return;
    const utcDay = new Date().toISOString().slice(0, 10);
    if (get().content?.day === utcDay) return;
    set({ loading: true });
    try {
      const c = await fetchDailyContent();
      set({ content: c });
    } finally {
      set({ loading: false });
    }
  },
}));
