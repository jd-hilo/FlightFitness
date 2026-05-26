import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { scheduleTrackingRemoteSave } from '@/lib/api/trackingPersistence';

export type WeightLogEntry = {
  dateKey: string;
  weightLb: number;
  updatedAt: string;
};

type WeightLogState = {
  entries: WeightLogEntry[];
  logWeight: (dateKey: string, weightLb: number) => void;
  getEntryForDate: (dateKey: string) => WeightLogEntry | undefined;
  getLatestEntry: () => WeightLogEntry | undefined;
  getSortedEntries: () => WeightLogEntry[];
  reset: () => void;
};

export const useWeightLogStore = create<WeightLogState>()(
  persist(
    (set, get) => ({
      entries: [],

      logWeight: (dateKey, weightLb) => {
        const safe = Math.max(50, Math.min(600, Math.round(weightLb * 10) / 10));
        const updatedAt = new Date().toISOString();
        const existing = get().entries.filter((e) => e.dateKey !== dateKey);
        const next = [...existing, { dateKey, weightLb: safe, updatedAt }].sort((a, b) =>
          a.dateKey.localeCompare(b.dateKey)
        );
        set({ entries: next });
        scheduleTrackingRemoteSave();
      },

      getEntryForDate: (dateKey) => get().entries.find((e) => e.dateKey === dateKey),

      getLatestEntry: () => {
        const sorted = get().getSortedEntries();
        return sorted[sorted.length - 1];
      },

      getSortedEntries: () => [...get().entries].sort((a, b) => a.dateKey.localeCompare(b.dateKey)),

      reset: () => set({ entries: [] }),
    }),
    {
      name: 'flight-weight-log',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
