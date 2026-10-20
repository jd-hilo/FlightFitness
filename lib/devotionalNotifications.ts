import { Platform } from 'react-native';

import { track } from '@/lib/analytics';
import { getDailyFaithReading } from '@/lib/faithReadings';
import { formatYmdLocal } from '@/lib/weekUtils';
import { useDevotionalNotificationStore } from '@/stores/devotionalNotificationStore';

const CHANNEL_ID = 'daily-devotional';
const ID_PREFIX = 'devotional-';
const DAYS_AHEAD = 60;
const HOUR = 9;

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null | undefined;
let handlerReady = false;
let syncChain: Promise<void> = Promise.resolve();

async function loadNotifications(): Promise<NotificationsModule | null> {
  if (Platform.OS === 'web') return null;
  if (notificationsModule !== undefined) return notificationsModule;
  try {
    notificationsModule = await import('expo-notifications');
    return notificationsModule;
  } catch {
    notificationsModule = null;
    return null;
  }
}

function ensureHandler(Notifications: NotificationsModule) {
  if (handlerReady) return;
  handlerReady = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function passagePreview(text: string, max = 120): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  const trimmed = (lastSpace > 70 ? cut.slice(0, lastSpace) : cut).trim();
  return `${trimmed}…`;
}

function isDevotionalData(data: unknown): boolean {
  return (
    typeof data === 'object' &&
    data != null &&
    'kind' in data &&
    (data as { kind?: unknown }).kind === 'devotional'
  );
}

/** Shows the system permission sheet. Returns whether alerts are allowed. */
export async function requestDevotionalPermission(): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;
  try {
    ensureHandler(Notifications);
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const next = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    });
    return next.granted;
  } catch {
    return false;
  }
}

async function cancelDevotionalNotifications(Notifications: NotificationsModule) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.identifier.startsWith(ID_PREFIX))
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier))
  );
}

async function syncInner() {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  try {
    ensureHandler(Notifications);
    const wantsDaily = useDevotionalNotificationStore.getState().wantsDaily;
    if (!wantsDaily) {
      await cancelDevotionalNotifications(Notifications);
      return;
    }

    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Daily devotional',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    }

    await cancelDevotionalNotifications(Notifications);

    const now = Date.now();
    for (let offset = 0; offset < DAYS_AHEAD; offset++) {
      const when = new Date();
      when.setDate(when.getDate() + offset);
      when.setHours(HOUR, 0, 0, 0);
      if (when.getTime() <= now + 30_000) continue;

      const reading = getDailyFaithReading(when);
      await Notifications.scheduleNotificationAsync({
        identifier: `${ID_PREFIX}${formatYmdLocal(when)}`,
        content: {
          title: reading.title,
          subtitle: reading.reference,
          body: passagePreview(reading.passage),
          sound: true,
          data: { kind: 'devotional' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: when,
          channelId: CHANNEL_ID,
        },
      });
    }
  } catch {
    // Native module missing until the next dev-client build, or the OS rejected a schedule.
  }
}

/** Refill the next 60 mornings at 9:00 in the device's local time. */
export function syncDailyDevotionalNotifications(): Promise<void> {
  syncChain = syncChain.then(syncInner, syncInner);
  return syncChain;
}

/** Opens Faith when a devotional notification is tapped, including a cold start. */
export async function listenForDevotionalOpens(openFaith: () => void): Promise<() => void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return () => {};
  try {
    ensureHandler(Notifications);
    const openOnce = async (data: unknown) => {
      if (!isDevotionalData(data)) return;
      openFaith();
      try {
        await Notifications.clearLastNotificationResponseAsync();
      } catch {
        // Ignore if this Expo build cannot clear the last response.
      }
    };
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      void openOnce(response.notification.request.content.data);
    });
    const last = await Notifications.getLastNotificationResponseAsync();
    if (last) void openOnce(last.notification.request.content.data);
    return () => sub.remove();
  } catch {
    return () => {};
  }
}

export function trackDevotionalChoice(choice: 'yes' | 'no') {
  track('devotional notification choice', { choice });
}

export function trackDevotionalPermission(granted: boolean) {
  track('devotional notification permission', { granted });
}
