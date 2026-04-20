import { create } from 'zustand';

import {
  fetchUnreadCoachCount,
  getCoachChatUserId,
  markThreadRead,
  subscribeCoachMessages,
} from '@/lib/api/coachChat';
import { supabaseConfigured } from '@/lib/supabase';

type CoachChatState = {
  unreadCount: number;
  refreshUnread: () => Promise<void>;
  markThreadReadAndRefresh: () => Promise<void>;
  /**
   * Subscribe to realtime + initial unread fetch. Returns cleanup.
   * Safe if Supabase is not configured (no-op cleanup).
   */
  bindRealtime: () => () => void;
};

export const useCoachChatStore = create<CoachChatState>((set, get) => ({
  unreadCount: 0,

  refreshUnread: async () => {
    if (!supabaseConfigured) return;
    const n = await fetchUnreadCoachCount();
    set({ unreadCount: n });
  },

  markThreadReadAndRefresh: async () => {
    await markThreadRead();
    await get().refreshUnread();
  },

  bindRealtime: () => {
    if (!supabaseConfigured) return () => {};

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    void (async () => {
      const uid = await getCoachChatUserId();
      if (cancelled || !uid) return;
      unsubscribe = subscribeCoachMessages(
        uid,
        ({ sender }) => {
          if (sender === 'coach') void get().refreshUnread();
        },
        'unread'
      );
      if (cancelled) {
        unsubscribe();
        unsubscribe = null;
        return;
      }
      await get().refreshUnread();
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
      unsubscribe = null;
    };
  },
}));
