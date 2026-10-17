import { router, type Href } from 'expo-router';

import { continueAfterRegisteredAuth } from '@/lib/onboardingFirstSession';
import { useOnboardingStore } from '@/stores/onboardingStore';

const FIRST_NAME_MAX = 40;

/** Persist pre-auth answers, then open faith goals. Completed accounts go home. */
export async function finishAuthAndRoute(givenName?: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const name = givenName?.trim();
  if (name) {
    const current = useOnboardingStore.getState().answers.firstName.trim();
    if (!current) {
      useOnboardingStore.getState().setAnswers({
        firstName: name.slice(0, FIRST_NAME_MAX),
      });
    }
  }

  const next = await continueAfterRegisteredAuth();
  if (!next.ok) return next;
  if (next.destination === 'home') {
    router.replace('/' as Href);
  } else {
    router.replace('/(onboarding)/faith-goals' as Href);
  }
  return { ok: true };
}
