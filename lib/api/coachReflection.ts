import { ensureFreshSessionForEdge, supabase, supabaseConfigured } from '@/lib/supabase';

export type CoachReflectionPrompt = {
  id: string;
  prompt_date: string;
  title: string;
  body: string;
  coach_id: string;
};

/** Today's coach-assigned Faith reflection, if any. */
export async function fetchCoachReflectionForDate(
  dateYmd: string
): Promise<CoachReflectionPrompt | null> {
  if (!supabaseConfigured || !supabase) return null;
  const session = await ensureFreshSessionForEdge();
  const uid = session?.user.id;
  if (!uid) return null;

  const { data, error } = await supabase
    .from('coach_reflection_prompts')
    .select('id, prompt_date, title, body, coach_id')
    .eq('client_user_id', uid)
    .eq('prompt_date', dateYmd)
    .maybeSingle();

  if (error) {
    if (__DEV__) console.warn('[fetchCoachReflectionForDate]', error.message);
    return null;
  }
  if (!data) return null;
  return data as CoachReflectionPrompt;
}
