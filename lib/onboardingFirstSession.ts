import { persistProfileOnboarding } from '@/lib/api/profileOnboarding';
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

/** Persist profile, mark onboarding complete, and keep the demo workout they just felt. */
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
