import { create } from 'zustand';

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
  /** Sum of weight × reps for completed sets (lb). */
  volumeLb?: number;
};

type WorkoutSessionLogState = {
  sessions: WorkoutSessionLogEntry[];
  logCompletedSession: (input: {
    /** Prefer the active workout sessionId so history + session log share one id. */
    id?: string;
    title: string;
    sourceWorkoutId: string;
    durationSec: number;
    volumeLb?: number;
    finishedAt?: string;
  }) => void;
  updateSessionDuration: (
    sessionId: string,
    durationSec: number,
    /** When editing a history-inferred session not yet in the log, upsert it. */
    seed?: Omit<WorkoutSessionLogEntry, 'durationSec'>
  ) => void;
  getSessionsForDate: (dateKey: string) => WorkoutSessionLogEntry[];
  reset: () => void;
};

export const useWorkoutSessionLogStore = create<WorkoutSessionLogState>()((set, get) => ({
      sessions: [],

      logCompletedSession: ({
        id,
        title,
        sourceWorkoutId,
        durationSec,
        volumeLb,
        finishedAt,
      }) => {
        const at = finishedAt ?? new Date().toISOString();
        const dateKey = formatYmdLocal(new Date(at));
        const entryId = id?.trim() || newId('wlog');
        const entry: WorkoutSessionLogEntry = {
          id: entryId,
          title,
          sourceWorkoutId,
          dateKey,
          finishedAt: at,
          durationSec: Math.max(0, durationSec),
          volumeLb: Math.max(0, Math.round(volumeLb ?? 0)),
        };
        const withoutDup = get().sessions.filter((s) => s.id !== entryId);
        set({ sessions: [entry, ...withoutDup].slice(0, 200) });
        scheduleTrackingRemoteSave(0);
      },

      updateSessionDuration: (sessionId, durationSec, seed) => {
        const next = Math.max(0, Math.floor(durationSec));
        const existing = get().sessions.find((s) => s.id === sessionId);
        if (existing) {
          if (existing.durationSec === next) return;
          set({
            sessions: get().sessions.map((s) =>
              s.id === sessionId ? { ...s, durationSec: next } : s
            ),
          });
          scheduleTrackingRemoteSave();
          return;
        }
        if (!seed || seed.id !== sessionId) return;
        set({
          sessions: [
            { ...seed, durationSec: next },
            ...get().sessions,
          ].slice(0, 200),
        });
        scheduleTrackingRemoteSave();
      },

      getSessionsForDate: (dateKey) =>
        get().sessions.filter((s) => s.dateKey === dateKey),

      reset: () => set({ sessions: [] }),
}));
