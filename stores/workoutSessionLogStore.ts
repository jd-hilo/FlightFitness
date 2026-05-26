import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { newId } from '@/lib/exerciseNormalize';
import { formatYmdLocal } from '@/lib/weekUtils';
import { scheduleTrackingRemoteSave } from '@/lib/api/trackingPersistence';

export type WorkoutSessionLogEntry = {
  id: string;
  title: string;
  sourceWorkoutId: string;
  dateKey: string;
  finishedAt: string;
  durationSec: number;
};

type WorkoutSessionLogState = {
  sessions: WorkoutSessionLogEntry[];
  logCompletedSession: (input: {
    title: string;
    sourceWorkoutId: string;
    durationSec: number;
    finishedAt?: string;
  }) => void;
  getSessionsForDate: (dateKey: string) => WorkoutSessionLogEntry[];
  reset: () => void;
};

export const useWorkoutSessionLogStore = create<WorkoutSessionLogState>()(
  persist(
    (set, get) => ({
      sessions: [],

      logCompletedSession: ({ title, sourceWorkoutId, durationSec, finishedAt }) => {
        const at = finishedAt ?? new Date().toISOString();
        const dateKey = formatYmdLocal(new Date(at));
        const entry: WorkoutSessionLogEntry = {
          id: newId('wlog'),
          title,
          sourceWorkoutId,
          dateKey,
          finishedAt: at,
          durationSec: Math.max(0, durationSec),
        };
        set({ sessions: [entry, ...get().sessions].slice(0, 200) });
        scheduleTrackingRemoteSave();
      },

      getSessionsForDate: (dateKey) =>
        get().sessions.filter((s) => s.dateKey === dateKey),

      reset: () => set({ sessions: [] }),
    }),
    {
      name: 'flight-workout-session-log',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
