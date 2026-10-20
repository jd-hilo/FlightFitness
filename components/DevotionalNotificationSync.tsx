import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import {
  listenForDevotionalOpens,
  syncDailyDevotionalNotifications,
} from '@/lib/devotionalNotifications';
import { useDevotionalNotificationStore } from '@/stores/devotionalNotificationStore';

/** Keeps the 9:00 local devotional scheduled, and opens Faith when one is tapped. */
export function DevotionalNotificationSync() {
  const wantsDaily = useDevotionalNotificationStore((s) => s.wantsDaily);

  useEffect(() => {
    if (!wantsDaily) return;
    void syncDailyDevotionalNotifications();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncDailyDevotionalNotifications();
    });
    return () => sub.remove();
  }, [wantsDaily]);

  useEffect(() => {
    let remove = () => {};
    let cancelled = false;
    void listenForDevotionalOpens(() => {
      router.push('/(tabs)/faith');
    }).then((unsubscribe) => {
      if (cancelled) unsubscribe();
      else remove = unsubscribe;
    });
    return () => {
      cancelled = true;
      remove();
    };
  }, []);

  return null;
}
