import {
  persistProfileOnboarding,
  pullProfileOnboardingIntoStore,
} from '@/lib/api/profileOnboarding';
import { newId } from '@/lib/exerciseNormalize';
import { viewWeekStartYmdLocal } from '@/lib/weekUtils';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { usePlanStore } from '@/stores/planStore';
import { useWorkoutLibraryStore } from '@/stores/workoutLibraryStore';
import type { Exercise } from '@/types/plan';

export const ONBOARDING_DEMO_REST_SEC = 20;
export const ONBOARDING_STARTER_TITLE = 'Day 1 — Plank';

export function onboardingDemoExercise(): Exercise {
  return {
    id: 'onboarding-plank',
    name: 'Plank',
    catalogExerciseId: 'plank',
    sets: 1,
    reps: '20 sec',
    restSec: ONBOARDING_DEMO_REST_SEC,
    notes: 'Hold a strong line. Tap the set when you finish.',
    setRows: [
      {
        id: 'onboarding-plank-set-1',
        targetReps: '20 sec',
        restSec: ONBOARDING_DEMO_REST_SEC,
        completed: false,
      },
    ],
  };
}

function seedStarterWorkout() {
  const library = useWorkoutLibraryStore.getState();
  if (library.workouts.some((w) => w.title === ONBOARDING_STARTER_TITLE)) return;
  const id = library.createWorkout(ONBOARDING_STARTER_TITLE);
  if (!id) return;
  library.addExercise(id, {
    ...onboardingDemoExercise(),
    id: newId('ex'),
    setRows: [
      {
        id: newId('set'),
        targetReps: '20 sec',
        restSec: ONBOARDING_DEMO_REST_SEC,
        completed: true,
      },
    ],
  });
}

/**
 * After Apple or email sign-in, keep the answers they gave before creating an account.
 * Does not set completedAt. Returning users who already finished onboarding go home
 * instead of overwriting that completion.
 */
export async function continueAfterRegisteredAuth(): Promise<
  | { ok: true; destination: 'home' | 'onboarding' }
  | { ok: false; error: string }
> {
  const localAnswers = { ...useOnboardingStore.getState().answers };

  let remoteComplete = false;
  try {
    remoteComplete = await pullProfileOnboardingIntoStore();
  } catch (error) {
    if (__DEV__) console.warn('[continueAfterRegisteredAuth]', error);
  }

  if (remoteComplete || useOnboardingStore.getState().completedAt) {
    return { ok: true, destination: 'home' };
  }

  const pulledName = useOnboardingStore.getState().answers.firstName.trim();
  const answersToSave = {
    ...localAnswers,
    firstName: localAnswers.firstName.trim() || pulledName,
  };
  useOnboardingStore.getState().setAnswers(answersToSave);

  // The helper requires a string. Empty means "not finished"; pull treats that as incomplete.
  const saved = await persistProfileOnboarding(answersToSave, '');
  if (!saved.ok) return saved;
  return { ok: true, destination: 'onboarding' };
}

/**
 * Legacy helper. The live path must not call this before the paywall —
 * completedAt is set only when they skip, purchase, or restore.
 */
export async function completeOnboardingAfterFirstSession(opts?: {
  seedWorkout?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const answers = useOnboardingStore.getState().answers;
  const macroTargets = usePlanStore.getState().macroTargets;
  if (!macroTargets) {
    return { ok: false, error: 'Go back and save your macro targets first.' };
  }

  const completedAt = new Date().toISOString();
  const res = await persistProfileOnboarding(answers, completedAt, macroTargets);
  if (!res.ok) return res;

  useOnboardingStore.getState().complete(completedAt);
  usePlanStore.getState().ensureWeekPlanShell(viewWeekStartYmdLocal());
  usePlanStore.getState().setMacroTargets(macroTargets);

  if (opts?.seedWorkout !== false) {
    seedStarterWorkout();
  }

  return { ok: true };
}
