import * as Haptics from 'expo-haptics';

/**
 * Safe haptics wrappers. Haptics is a native module — if the running build
 * doesn't include it (e.g. an outdated dev client) the calls throw either
 * synchronously or as a rejected promise. These helpers swallow both so a
 * missing/unavailable native module never crashes the UI; haptics simply no-op.
 */

export function hapticImpact(
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium
) {
  try {
    Haptics.impactAsync(style)?.catch(() => {});
  } catch {
    // native module unavailable — ignore
  }
}

export function hapticNotify(
  type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success
) {
  try {
    Haptics.notificationAsync(type)?.catch(() => {});
  } catch {
    // native module unavailable — ignore
  }
}

export function hapticSelection() {
  try {
    Haptics.selectionAsync()?.catch(() => {});
  } catch {
    // native module unavailable — ignore
  }
}

export const ImpactStyle = Haptics.ImpactFeedbackStyle;
export const NotificationType = Haptics.NotificationFeedbackType;
