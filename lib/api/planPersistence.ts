import { getWeekPlanFromStore } from '@/lib/planFromStore';
import {
  ensureFreshSessionForEdge,
  supabase,
  supabaseConfigured,
} from '@/lib/supabase';
import { weekPlanSchema, type WeekPlan } from '@/types/plan';

let lastLocalSaveStartedAt = 0;
let saveChain: Promise<void> = Promise.resolve();

/** Call before/while persisting locally so realtime does not clobber in-flight edits. */
export function markLocalPlanSaveStarted() {
  lastLocalSaveStartedAt = Date.now();
}

export function shouldIgnoreRemotePlanUpdate(): boolean {
  return Date.now() - lastLocalSaveStartedAt < 3500;
}

export type UpsertWeekPlanResult =
  | { ok: true }
  | { ok: false; error: string };

export async function upsertWeekPlan(
  plan: WeekPlan
): Promise<UpsertWeekPlanResult> {
  if (!supabaseConfigured || !supabase) {
    return { ok: false, error: 'Supabase not configured' };
  }

  const parsed = weekPlanSchema.safeParse(plan);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid plan' };
  }

  const session = await ensureFreshSessionForEdge();
  const uid = session?.user?.id;
  if (!uid) {
    return { ok: false, error: 'Not signed in' };
  }

  markLocalPlanSaveStarted();

  const payload = parsed.data as unknown as Record<string, unknown>;

  const { data: existing, error: findError } = await supabase
    .from('plans')
    .select('id')
    .eq('user_id', uid)
    .eq('week_start', parsed.data.weekStart)
    .maybeSingle();

  if (findError) {
    return { ok: false, error: findError.message };
  }

  if (existing?.id) {
    const { error } = await supabase
      .from('plans')
      .update({ payload })
      .eq('id', existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from('plans').insert({
      user_id: uid,
      week_start: parsed.data.weekStart,
      payload,
    });
    if (error) return { ok: false, error: error.message };
  }

  markLocalPlanSaveStarted();
  return { ok: true };
}

/** Debounced save of the current store snapshot (serialized to avoid races). */
export function scheduleRemotePlanSave(delayMs = 900) {
  saveChain = saveChain.then(async () => {
    await new Promise((r) => setTimeout(r, delayMs));
    const plan = getWeekPlanFromStore();
    if (!plan) return;
    markLocalPlanSaveStarted();
    const res = await upsertWeekPlan(plan);
    if (!res.ok && __DEV__) {
      console.warn('[scheduleRemotePlanSave]', res.error);
    }
  });
}
