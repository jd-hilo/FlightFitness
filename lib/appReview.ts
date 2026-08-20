import AsyncStorage from '@react-native-async-storage/async-storage';

import { track } from '@/lib/analytics';
import { useVerseModalStore } from '@/stores/verseModalStore';

const PROMPTED_KEY = 'flight-review-prompted';

async function requestNativeReview(): Promise<boolean> {
  try {
    // Dynamic import so dev clients built before expo-store-review don't crash.
    const StoreReview = await import('expo-store-review');
    if (!(await StoreReview.isAvailableAsync())) return false;
    await StoreReview.requestReview();
    return true;
  } catch {
    return false;
  }
}

/**
 * Ask for an App Store rating once, right after the first workout's
 * post-finish verse modal is dismissed (the emotional high point).
 * iOS may still rate-limit or suppress the sheet; that's expected.
 */
export function scheduleFirstWorkoutReviewPrompt() {
  void (async () => {
    if (await AsyncStorage.getItem(PROMPTED_KEY)) return;

    const fire = () => {
      setTimeout(() => {
        void (async () => {
          const shown = await requestNativeReview();
          if (shown) await AsyncStorage.setItem(PROMPTED_KEY, new Date().toISOString());
          track('review prompt requested', { shown, trigger: 'first_workout' });
        })();
      }, 600);
    };

    if (!useVerseModalStore.getState().visible) {
      fire();
      return;
    }
    const unsubscribe = useVerseModalStore.subscribe((state) => {
      if (state.visible) return;
      unsubscribe();
      fire();
    });
  })();
}
