import type { RealtimeChannel } from '@supabase/supabase-js';

import {
  ensureFreshSessionForEdge,
  supabase,
  supabaseConfigured,
} from '@/lib/supabase';

export type CoachMessageRow = {
  id: string;
  user_id: string;
  sender: 'user' | 'coach';
  body: string;
  created_at: string;
};

async function getSessionUserId(): Promise<string | null> {
  if (!supabaseConfigured || !supabase) return null;
  const session = await ensureFreshSessionForEdge();
  return session?.user.id ?? null;
}

export async function getCoachChatUserId(): Promise<string | null> {
  return getSessionUserId();
}

export async function fetchCoachMessages(): Promise<CoachMessageRow[]> {
  const uid = await getSessionUserId();
  if (!uid || !supabase) return [];
  const { data, error } = await supabase
    .from('coach_messages')
    .select('id, user_id, sender, body, created_at')
    .eq('user_id', uid)
    .order('created_at', { ascending: true });
  if (error) {
    if (__DEV__) console.warn('[fetchCoachMessages]', error.message);
    return [];
  }
  return (data ?? []) as CoachMessageRow[];
}

export async function sendUserMessage(body: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: 'Message is empty.' };
  const uid = await getSessionUserId();
  if (!uid || !supabase) return { ok: false, error: 'Not signed in.' };
  const { error } = await supabase.from('coach_messages').insert({
    user_id: uid,
    sender: 'user',
    body: trimmed,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function fetchThreadLastRead(): Promise<string | null> {
  const uid = await getSessionUserId();
  if (!uid || !supabase) return null;
  const { data, error } = await supabase
    .from('coach_threads')
    .select('last_read_at')
    .eq('user_id', uid)
    .maybeSingle();
  if (error) {
    if (__DEV__) console.warn('[fetchThreadLastRead]', error.message);
    return null;
  }
  return data?.last_read_at ?? null;
}

/** Marks all messages read as of now (upserts thread row). */
export async function markThreadRead(): Promise<void> {
  const uid = await getSessionUserId();
  if (!uid || !supabase) return;
  const now = new Date().toISOString();
  const { error } = await supabase.from('coach_threads').upsert(
    {
      user_id: uid,
      last_read_at: now,
      updated_at: now,
    },
    { onConflict: 'user_id' }
  );
  if (error && __DEV__) console.warn('[markThreadRead]', error.message);
}

export async function fetchUnreadCoachCount(): Promise<number> {
  const uid = await getSessionUserId();
  if (!uid || !supabase) return 0;
  const lastRead = await fetchThreadLastRead();
  const after = lastRead ?? new Date(0).toISOString();
  const { count, error } = await supabase
    .from('coach_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', uid)
    .eq('sender', 'coach')
    .gt('created_at', after);
  if (error) {
    if (__DEV__) console.warn('[fetchUnreadCoachCount]', error.message);
    return 0;
  }
  return count ?? 0;
}

/** Subscribes to new message rows for this user. Use distinct `channelKey` per concurrent subscription (e.g. unread vs chat screen). */
export function subscribeCoachMessages(
  userId: string,
  onInsert: (payload: { sender: 'user' | 'coach' }) => void,
  channelKey = 'main'
): () => void {
  const client = supabase;
  if (!supabaseConfigured || !client) return () => {};

  const ch: RealtimeChannel = client
    .channel(`coach_messages:${userId}:${channelKey}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'coach_messages',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new as { sender?: string } | null;
        const s = row?.sender;
        if (s === 'user' || s === 'coach') onInsert({ sender: s });
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(ch);
  };
}
