import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect } from 'react';

import { ensureFreshSessionForEdge, supabase, supabaseConfigured } from '@/lib/supabase';
import { viewWeekStartYmdLocal } from '@/lib/weekUtils';
import { normalizeWeekPlanFromAI } from '@/lib/weekPlanAINormalize';
import { usePlanStore } from '@/stores/planStore';
import { weekPlanSchema, type WeekPlan } from '@/types/plan';

function parseRemotePayload(raw: unknown): WeekPlan | null {
  const normalized = normalizeWeekPlanFromAI(raw);
  const parsed = weekPlanSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}

/**
 * When the coach dashboard updates `plans` in Supabase, refresh the local plan store
 * for the current calendar week (same `week_start` as the home tab).
 */
function newRealtimeInstanceSuffix(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function usePlanRemoteRealtime() {
  useEffect(() => {
    if (!supabaseConfigured || !supabase) return;

    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    /** Unique topic so we never chain `.on()` onto a channel Supabase already left subscribed. */
    const instanceSuffix = newRealtimeInstanceSuffix();

    void (async () => {
      const session = await ensureFreshSessionForEdge();
      const uid = session?.user?.id;
      if (!uid || cancelled) return;

      const ch = supabase
        .channel(`plans_remote:${uid}:${instanceSuffix}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'plans',
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            const row = payload.new as { week_start?: string; payload?: unknown } | null;
            if (!row?.week_start || row.payload === undefined || row.payload === null) return;
            const viewWeek = viewWeekStartYmdLocal();
            if (row.week_start !== viewWeek) return;
            const parsed = parseRemotePayload(row.payload);
            if (parsed) {
              usePlanStore.getState().setFromWeekPlan(parsed);
            }
          }
        )
        .subscribe();

      if (cancelled) {
        supabase.removeChannel(ch);
        return;
      }
      channel = ch;
    })();

    return () => {
      cancelled = true;
      if (channel && supabase) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, []);
}

export function PlanRemoteRealtimeSync() {
  usePlanRemoteRealtime();
  return null;
}
