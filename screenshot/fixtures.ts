import versesData from '@/assets/data/verses.json';
import readings from '@/assets/data/faithReadings.json';
import { formatRepdbCatalogId } from '@/lib/repdbCatalog';
import { SCREENSHOT_LOCAL } from '@/lib/screenshotMode';
import { formatYmdLocal } from '@/lib/weekUtils';
import type { DailyContent } from '@/lib/api/dailyContent';
import type { FaithReading } from '@/lib/faithReadings';
import type { VerseEntry } from '@/lib/verses';
import type { Exercise, ExerciseSetRow, OnboardingAnswers } from '@/types/plan';
import type { SavedWorkout } from '@/stores/workoutLibraryStore';
import type { WorkoutSessionLogEntry } from '@/stores/workoutSessionLogStore';
import type { ExerciseHistoryEntry, LoggedSetSnapshot } from '@/stores/exerciseHistoryStore';

export const SCREENSHOT_WORKOUT_IDS = {
  upper: 'sw-upper-strength-a',
  lower: 'sw-lower-strength-a',
  home: 'sw-full-body-home',
} as const;

export const SCREENSHOT_FIRST_NAME = 'Caleb';

const verses = versesData as VerseEntry[];
const faithList = readings as FaithReading[];

export const SCREENSHOT_VERSE: VerseEntry = verses.find((v) => v.id === 'v22')!;
export const SCREENSHOT_FAITH_READING: FaithReading = faithList.find((r) => r.id === 'fr5')!;

export function screenshotNow(): Date {
  return new Date(
    SCREENSHOT_LOCAL.year,
    SCREENSHOT_LOCAL.month,
    SCREENSHOT_LOCAL.day,
    SCREENSHOT_LOCAL.hour,
    SCREENSHOT_LOCAL.minute,
    0,
    0
  );
}

export function screenshotTodayKey(): string {
  return formatYmdLocal(screenshotNow());
}

/** Sunday of the US week containing the frozen Tuesday (for Home 3-of-4). */
export function screenshotSundayWeekStart(): string {
  return ymdOffset(screenshotNow(), -2);
}

function ymdOffset(from: Date, days: number): string {
  const d = new Date(from);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return formatYmdLocal(d);
}

function isoAt(dateKey: string, hour: number, minute: number): string {
  const [y, m, day] = dateKey.split('-').map(Number);
  return new Date(y!, m! - 1, day!, hour, minute, 0, 0).toISOString();
}

function setRows(
  exerciseId: string,
  count: number,
  targetReps: string,
  restSec: number,
  weightLb?: number
): ExerciseSetRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `set-${exerciseId}-${i}`,
    targetReps,
    restSec,
    completed: false,
    ...(weightLb != null ? { weightLb } : {}),
  }));
}

function exercise(input: {
  id: string;
  name: string;
  slug: string;
  sets: number;
  reps: string;
  restSec: number;
  weightLb?: number;
}): Exercise {
  const catalogExerciseId = formatRepdbCatalogId(input.slug);
  return {
    id: input.id,
    name: input.name,
    catalogExerciseId,
    sets: input.sets,
    reps: input.reps,
    restSec: input.restSec,
    setRows: setRows(input.id, input.sets, input.reps, input.restSec, input.weightLb),
  };
}

export function screenshotUpperExercises(): Exercise[] {
  return [
    exercise({
      id: 'ex-bench',
      name: 'Bench Press',
      slug: 'bench-press',
      sets: 4,
      reps: '6',
      restSec: 150,
      weightLb: 185,
    }),
    exercise({
      id: 'ex-incline',
      name: 'Incline DB Press',
      slug: 'incline-db-press',
      sets: 3,
      reps: '10',
      restSec: 90,
      weightLb: 60,
    }),
    exercise({
      id: 'ex-pullup',
      name: 'Pull-Up',
      slug: 'pull-up',
      sets: 4,
      reps: '8',
      restSec: 120,
    }),
    exercise({
      id: 'ex-row',
      name: 'Seated Cable Row',
      slug: 'wide-grip-seated-cable-row',
      sets: 3,
      reps: '10',
      restSec: 90,
      weightLb: 140,
    }),
    exercise({
      id: 'ex-lat',
      name: 'Lateral Raise',
      slug: 'lateral-raise',
      sets: 3,
      reps: '15',
      restSec: 60,
      weightLb: 20,
    }),
  ];
}

export function screenshotLowerExercises(): Exercise[] {
  return [
    exercise({
      id: 'ex-squat',
      name: 'Back Squat',
      slug: 'squat',
      sets: 4,
      reps: '5',
      restSec: 180,
      weightLb: 225,
    }),
    exercise({
      id: 'ex-rdl',
      name: 'Romanian Deadlift',
      slug: 'romanian-deadlift',
      sets: 3,
      reps: '8',
      restSec: 120,
      weightLb: 185,
    }),
    exercise({
      id: 'ex-lunge',
      name: 'Walking Lunge',
      slug: 'walking-lunge',
      sets: 3,
      reps: '10',
      restSec: 75,
      weightLb: 40,
    }),
    exercise({
      id: 'ex-calf',
      name: 'Calf Raise',
      slug: 'standing-calf-raise',
      sets: 3,
      reps: '12',
      restSec: 60,
      weightLb: 185,
    }),
  ];
}

export function screenshotHomeExercises(): Exercise[] {
  return [
    exercise({
      id: 'ex-pushup',
      name: 'Push-Up',
      slug: 'push-up',
      sets: 3,
      reps: '12',
      restSec: 60,
    }),
    exercise({
      id: 'ex-goblet',
      name: 'Goblet Squat',
      slug: 'goblet-squat',
      sets: 3,
      reps: '10',
      restSec: 75,
      weightLb: 50,
    }),
    exercise({
      id: 'ex-dbrow',
      name: 'DB Row',
      slug: 'bent-over-db-row',
      sets: 3,
      reps: '10',
      restSec: 75,
      weightLb: 55,
    }),
    exercise({
      id: 'ex-plank',
      name: 'Plank',
      slug: 'plank',
      sets: 3,
      reps: '45',
      restSec: 45,
    }),
  ];
}

export function screenshotWorkouts(): SavedWorkout[] {
  const created = isoAt('2026-09-12', 8, 0);
  return [
    {
      id: SCREENSHOT_WORKOUT_IDS.upper,
      title: 'Upper Strength A',
      exercises: screenshotUpperExercises(),
      createdAt: created,
      updatedAt: isoAt('2026-10-19', 18, 40),
    },
    {
      id: SCREENSHOT_WORKOUT_IDS.home,
      title: 'Full Body Home',
      exercises: screenshotHomeExercises(),
      createdAt: created,
      updatedAt: isoAt('2026-10-11', 9, 15),
    },
    {
      id: SCREENSHOT_WORKOUT_IDS.lower,
      title: 'Lower Strength A',
      exercises: screenshotLowerExercises(),
      createdAt: created,
      updatedAt: isoAt('2026-10-18', 17, 20),
    },
  ];
}

/**
 * 27 unique trained days from Sep 20–Oct 20 (31 calendar days → ~87% consistency).
 * Rest days: Sep 21, Sep 28, Oct 5, Oct 12.
 */
function trainedOffsets(): number[] {
  const rest = new Set([29, 22, 15, 8]);
  const out: number[] = [];
  for (let ago = 30; ago >= 0; ago--) {
    if (!rest.has(ago)) out.push(ago);
  }
  return out.slice(-27);
}

type SessionKind = 'upper' | 'lower' | 'home';

function kindForOffset(ago: number): SessionKind {
  const cycle = ago % 3;
  if (cycle === 0) return 'upper';
  if (cycle === 1) return 'lower';
  return 'home';
}

const TITLE: Record<SessionKind, string> = {
  upper: 'Upper Strength A',
  lower: 'Lower Strength A',
  home: 'Full Body Home',
};

const SOURCE: Record<SessionKind, string> = {
  upper: SCREENSHOT_WORKOUT_IDS.upper,
  lower: SCREENSHOT_WORKOUT_IDS.lower,
  home: SCREENSHOT_WORKOUT_IDS.home,
};

function benchWeightForDate(dateKey: string): number {
  const day = Number(dateKey.slice(-2));
  const month = Number(dateKey.slice(5, 7));
  if (month < 10) return 165 + Math.min(8, Math.floor(day / 4));
  if (day <= 6) return 175;
  if (day <= 11) return 180;
  if (day <= 16) return 185;
  return 185;
}

function squatWeightForDate(dateKey: string): number {
  return benchWeightForDate(dateKey) + 40;
}

export function screenshotSessions(): WorkoutSessionLogEntry[] {
  const now = screenshotNow();
  return trainedOffsets()
    .map((ago, i) => {
      const dateKey = ymdOffset(now, -ago);
      const kind = kindForOffset(ago);
      const durationSec = 44 * 60 + ((i * 37) % 14) * 60;
      const volumeLb =
        kind === 'upper'
          ? 9800 + i * 180
          : kind === 'lower'
            ? 11200 + i * 210
            : 4200 + i * 90;
      return {
        id: `wlog-${dateKey}-${kind}`,
        title: TITLE[kind],
        sourceWorkoutId: SOURCE[kind],
        dateKey,
        finishedAt: isoAt(dateKey, 18, 10),
        durationSec,
        volumeLb,
      };
    })
    .reverse();
}

function loggedSets(weightLb: number | undefined, reps: number, count: number): LoggedSetSnapshot[] {
  return Array.from({ length: count }, () => ({
    ...(weightLb != null ? { weightLb } : {}),
    reps,
  }));
}

export function screenshotExerciseHistory(): ExerciseHistoryEntry[] {
  const now = screenshotNow();
  const entries: ExerciseHistoryEntry[] = [];

  for (const ago of trainedOffsets()) {
    const dateKey = ymdOffset(now, -ago);
    const kind = kindForOffset(ago);
    const sessionId = `wlog-${dateKey}-${kind}`;
    const finishedAt = isoAt(dateKey, 18, 10);
    const sourceWorkoutId = SOURCE[kind];

    if (kind === 'upper') {
      const bench = benchWeightForDate(dateKey);
      entries.push(
        {
          id: `exhist-${dateKey}-bench`,
          sessionId,
          sourceWorkoutId,
          exerciseKey: `catalog:${formatRepdbCatalogId('bench-press')}`,
          exerciseName: 'Bench Press',
          catalogExerciseId: formatRepdbCatalogId('bench-press'),
          dateKey,
          finishedAt,
          sets: loggedSets(bench, 6, 4),
        },
        {
          id: `exhist-${dateKey}-incline`,
          sessionId,
          sourceWorkoutId,
          exerciseKey: `catalog:${formatRepdbCatalogId('incline-db-press')}`,
          exerciseName: 'Incline DB Press',
          catalogExerciseId: formatRepdbCatalogId('incline-db-press'),
          dateKey,
          finishedAt,
          sets: loggedSets(50 + Math.min(10, Math.floor((30 - ago) / 3)), 10, 3),
        }
      );
    } else if (kind === 'lower') {
      entries.push({
        id: `exhist-${dateKey}-squat`,
        sessionId,
        sourceWorkoutId,
        exerciseKey: `catalog:${formatRepdbCatalogId('squat')}`,
        exerciseName: 'Back Squat',
        catalogExerciseId: formatRepdbCatalogId('squat'),
        dateKey,
        finishedAt,
        sets: loggedSets(squatWeightForDate(dateKey), 5, 4),
      });
    }
  }

  return entries.reverse();
}

export function screenshotCompletionByDay(): Record<
  string,
  { mealIds: string[]; workoutDone: boolean; exerciseIdsDone: string[] }
> {
  const now = screenshotNow();
  const byDay: Record<
    string,
    { mealIds: string[]; workoutDone: boolean; exerciseIdsDone: string[] }
  > = {};
  for (const ago of trainedOffsets()) {
    byDay[ymdOffset(now, -ago)] = {
      mealIds: [],
      workoutDone: true,
      exerciseIdsDone: [],
    };
  }
  return byDay;
}

/** 19 devotionals + 14 reflections inside the 31-day window so All Time tiles match the brief. */
export function screenshotFaithByDay(): Record<
  string,
  { verseRead: boolean; studyRead: boolean; journalDone: boolean; journalLine: string }
> {
  const now = screenshotNow();
  const byDay: Record<
    string,
    { verseRead: boolean; studyRead: boolean; journalDone: boolean; journalLine: string }
  > = {};

  const recentLines = [
    'Showed up even when the lift felt heavy. Hope first, then the work.',
    'Rest is part of the race — not a gap in it.',
    'Eyes on Jesus, not the leaderboard. One more set.',
  ];

  const devoOffsets = [
    30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12,
  ];
  const reflectOffsets = [28, 26, 24, 22, 20, 18, 16, 14, 12, 10, 8, 6, 3, 1];
  const study = new Set(devoOffsets);
  const journals = new Set(reflectOffsets);

  for (let ago = 30; ago >= 1; ago--) {
    if (!study.has(ago) && !journals.has(ago)) continue;
    const key = ymdOffset(now, -ago);
    const studyRead = study.has(ago);
    const journalDone = journals.has(ago);
    const recentIdx = ago <= 3 ? 3 - ago : -1;
    byDay[key] = {
      verseRead: studyRead,
      studyRead,
      journalDone,
      journalLine: journalDone
        ? recentIdx >= 0
          ? recentLines[recentIdx] ?? recentLines[0]!
          : 'Grateful for strength that is not my own.'
        : '',
    };
  }

  byDay[screenshotTodayKey()] = {
    verseRead: false,
    studyRead: false,
    journalDone: false,
    journalLine: '',
  };

  return byDay;
}

export const SCREENSHOT_TODAY_REFLECTION =
  'The passage reminds me to keep showing up when the weight feels heavy. Strength comes from hoping in the Lord, not just grinding.';

export function screenshotOnboardingAnswers(): OnboardingAnswers {
  return {
    firstName: SCREENSHOT_FIRST_NAME,
    goal: ['build_muscle'],
    experience: 'two_plus_years',
    faithTenure: 'faith_few_years',
    faithGoals: [],
    equipment: ['full_gym'],
    dietPattern: '',
    dietModifiers: [],
    foodPreferences: [],
    trainingDaysPerWeek: 'four_sessions',
    trainingTimePrefs: [],
    currentWeightLb: 185,
    targetWeightLb: 178,
    sex: 'male',
    ageYears: 29,
    heightInches: 71,
    sessionLengthId: 'session_45',
    injuryLimitationIds: [],
    injuryNotes: '',
    allergyIds: [],
    allergyOtherNotes: '',
    dietOtherNotes: '',
    nutritionPaceId: 'pace_sustainable',
    mealsPerDayId: 'meals_3_snack',
    cookingSkillId: 'cook_comfortable',
  };
}

export function screenshotDailyContent(): DailyContent {
  return {
    day: screenshotNow().toISOString().slice(0, 10),
    verse: SCREENSHOT_VERSE,
    image_url:
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
  };
}

export function screenshotWeightEntries(): { dateKey: string; weightLb: number; updatedAt: string }[] {
  const now = screenshotNow();
  const points = [
    { ago: 28, weightLb: 188 },
    { ago: 21, weightLb: 187 },
    { ago: 14, weightLb: 186 },
    { ago: 7, weightLb: 185.5 },
    { ago: 2, weightLb: 185 },
  ];
  return points.map((p) => {
    const dateKey = ymdOffset(now, -p.ago);
    return { dateKey, weightLb: p.weightLb, updatedAt: isoAt(dateKey, 7, 30) };
  });
}
