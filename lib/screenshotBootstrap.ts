import { markScreenshotReady, isScreenshotMode } from '@/lib/screenshotMode';
import {
  SCREENSHOT_TODAY_REFLECTION,
  screenshotCompletionByDay,
  screenshotDailyContent,
  screenshotExerciseHistory,
  screenshotFaithByDay,
  screenshotNow,
  screenshotOnboardingAnswers,
  screenshotSessions,
  screenshotTodayKey,
  screenshotWeightEntries,
  screenshotWorkouts,
} from '@/screenshot/fixtures';
import { useCompletionStore } from '@/stores/completionStore';
import { useDailyContentStore } from '@/stores/dailyContentStore';
import { useDevotionalNotificationStore } from '@/stores/devotionalNotificationStore';
import { useExerciseHistoryStore } from '@/stores/exerciseHistoryStore';
import { useFaithDailyStore } from '@/stores/faithDailyStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useWeightLogStore } from '@/stores/weightLogStore';
import { useWorkoutLibraryStore } from '@/stores/workoutLibraryStore';
import { useWorkoutSessionLogStore } from '@/stores/workoutSessionLogStore';

export function applyScreenshotFixtures(options?: { reflectionCompleted?: boolean }) {
  if (!isScreenshotMode) return;

  try {
    const today = screenshotTodayKey();
    const faithByDay = screenshotFaithByDay();
    if (options?.reflectionCompleted) {
      faithByDay[today] = {
        verseRead: true,
        studyRead: true,
        journalDone: true,
        journalLine: SCREENSHOT_TODAY_REFLECTION,
      };
    }

    useOnboardingStore.setState({
      answers: screenshotOnboardingAnswers(),
      completedAt: '2026-09-01T12:00:00.000Z',
      intakeComplete: true,
    });

    useCompletionStore.setState({
      byDay: screenshotCompletionByDay(),
      streak: 12,
      lastStreakIncrementDate: today,
    });

    useFaithDailyStore.setState({
      byDay: faithByDay,
      faithStreak: options?.reflectionCompleted ? 8 : 7,
      lastFaithStreakDate: options?.reflectionCompleted
        ? today
        : Object.keys(faithByDay)
            .filter((k) => faithByDay[k]?.journalDone)
            .sort()
            .at(-1) ?? null,
    });

    useSubscriptionStore.setState({
      tier: 'essentials',
      freePlanUsed: true,
      freeAiWeekGenerationsRemaining: 0,
    });

    useDailyContentStore.setState({
      content: screenshotDailyContent(),
      loading: false,
      dailyFetchSettled: true,
    });

    useDevotionalNotificationStore.setState({
      asked: true,
      wantsDaily: false,
    });

    useWeightLogStore.setState({
      entries: screenshotWeightEntries(),
    });

    useWorkoutLibraryStore.setState({
      workouts: screenshotWorkouts(),
    });

    useWorkoutSessionLogStore.setState({
      sessions: screenshotSessions(),
    });

    useExerciseHistoryStore.setState({
      entries: screenshotExerciseHistory(),
    });

    void screenshotNow();
  } catch (error) {
    console.warn('[screenshot] fixtures failed', error);
  } finally {
    markScreenshotReady();
  }
}

export function applyScreenshotReflectionCompleted() {
  applyScreenshotFixtures({ reflectionCompleted: true });
}

if (isScreenshotMode) {
  applyScreenshotFixtures();
}
