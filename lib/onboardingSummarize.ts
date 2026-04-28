import type { OnboardingAnswers } from '@/types/plan';
import {
  ALLERGY_NONE_ID,
  ALLERGY_OPTIONS,
  COOKING_SKILL_OPTIONS,
  DIET_MODIFIER_OPTIONS,
  DIET_PATTERN_OPTIONS,
  EQUIPMENT_OPTIONS,
  EXPERIENCE_OPTIONS,
  FOOD_PREFERENCE_OPTIONS,
  GOAL_OPTIONS,
  INJURY_LIMITATION_OPTIONS,
  INJURY_NONE_ID,
  MEALS_PER_DAY_OPTIONS,
  NUTRITION_PACE_OPTIONS,
  SESSION_LENGTH_OPTIONS,
  SEX_OPTIONS,
  TRAINING_DAYS_OPTIONS,
  TRAINING_TIME_OPTIONS,
} from '@/lib/onboardingOptions';

function labelFor<
  T extends readonly { id: string; label: string; ai: string }[],
>(options: T, id: string): { label: string; ai: string } | null {
  const o = options.find((x) => x.id === id);
  return o ? { label: o.label, ai: o.ai } : null;
}

function linesForIds<
  T extends readonly { id: string; label: string; ai: string }[],
>(options: T, ids: string[]): string[] {
  return ids
    .map((id) => options.find((o) => o.id === id))
    .filter(Boolean)
    .map((o) => `- ${o!.label}: ${o!.ai}`);
}

/** Compact JSON for models — stable IDs, omits empty optional strings. */
export function buildOnboardingProfileJson(
  a: OnboardingAnswers
): Record<string, unknown> {
  const injuries = a.injuryLimitationIds.filter((id) => id !== INJURY_NONE_ID);
  const allergies = a.allergyIds.filter((id) => id !== ALLERGY_NONE_ID);
  const dietNotes = a.dietOtherNotes.trim();
  const injNotes = a.injuryNotes.trim();
  const allergyNotes = a.allergyOtherNotes.trim();

  return {
    goals: a.goal.length ? a.goal : undefined,
    experience: a.experience || undefined,
    equipment: a.equipment.length ? a.equipment : undefined,
    diet: {
      pattern: a.dietPattern || undefined,
      modifiers: a.dietModifiers.length ? a.dietModifiers : undefined,
      foodPreferences: a.foodPreferences.length ? a.foodPreferences : undefined,
      otherNotes: dietNotes || undefined,
    },
    body: {
      sex: a.sex || undefined,
      ageYears: a.ageYears,
      heightInches: a.heightInches,
      currentWeightLb: a.currentWeightLb,
      targetWeightLb: a.targetWeightLb,
    },
    training: {
      daysPerWeek: a.trainingDaysPerWeek || undefined,
      timePrefs: a.trainingTimePrefs.length ? a.trainingTimePrefs : undefined,
      sessionLengthId: a.sessionLengthId || undefined,
      injuryLimitationIds: injuries.length ? injuries : undefined,
      injuryNotes: injNotes || undefined,
    },
    nutritionStyle: {
      paceId: a.nutritionPaceId || undefined,
      mealsPerDayId: a.mealsPerDayId || undefined,
      cookingSkillId: a.cookingSkillId || undefined,
    },
    allergies: {
      ids: allergies.length ? allergies : undefined,
      otherNotes: allergyNotes || undefined,
    },
  };
}

/** Rich text block for the AI (and optional server logs). */
export function summarizeOnboardingForAI(a: OnboardingAnswers): string {
  const delta = a.targetWeightLb - a.currentWeightLb;
  const goals = a.goal
    .map((id) => labelFor(GOAL_OPTIONS, id))
    .filter(Boolean);
  const exp = labelFor(EXPERIENCE_OPTIONS, a.experience);
  const pattern = labelFor(DIET_PATTERN_OPTIONS, a.dietPattern);
  const days = labelFor(TRAINING_DAYS_OPTIONS, a.trainingDaysPerWeek);
  const sex = labelFor(SEX_OPTIONS, a.sex);
  const sessionLen = labelFor(SESSION_LENGTH_OPTIONS, a.sessionLengthId);
  const pace = labelFor(NUTRITION_PACE_OPTIONS, a.nutritionPaceId);
  const meals = labelFor(MEALS_PER_DAY_OPTIONS, a.mealsPerDayId);
  const cooking = labelFor(COOKING_SKILL_OPTIONS, a.cookingSkillId);

  const injuryIds = a.injuryLimitationIds.filter((id) => id !== INJURY_NONE_ID);
  const allergyIds = a.allergyIds.filter((id) => id !== ALLERGY_NONE_ID);

  const jsonBlock = JSON.stringify(buildOnboardingProfileJson(a), null, 2);

  const parts: string[] = [
    'Profile JSON (machine-readable):',
    jsonBlock,
    '',
    '---',
    '',
    `Body: ${a.ageYears} y, height ${a.heightInches} in total, current ${a.currentWeightLb} lb → target ${a.targetWeightLb} lb (delta ${delta >= 0 ? '+' : ''}${delta} lb).`,
    '',
    'Sex (for energy estimates only; keep copy inclusive):',
    sex ? `- ${sex.label}: ${sex.ai}` : '- (not specified)',
    '',
    'Primary goals (up to 2; first selected is highest priority):',
    ...(goals.length
      ? goals.map((goal) => `- ${goal!.label}: ${goal!.ai}`)
      : ['- (not specified)']),
    '',
    'Nutrition pace vs scale (single):',
    pace
      ? `- ${pace.label}: ${pace.ai}`
      : '- (not specified)',
    '',
    'Meals per day structure (single):',
    meals
      ? `- ${meals.label}: ${meals.ai}`
      : '- (not specified)',
    '',
    'Cooking skill (single):',
    cooking
      ? `- ${cooking.label}: ${cooking.ai}`
      : '- (not specified)',
    '',
    'Training experience (single):',
    exp
      ? `- ${exp.label}: ${exp.ai}`
      : '- (not specified)',
    '',
    'Typical session length (single):',
    sessionLen
      ? `- ${sessionLen.label}: ${sessionLen.ai}`
      : '- (not specified)',
    '',
    'Injuries / limitations (multi):',
    ...(injuryIds.length
      ? linesForIds(INJURY_LIMITATION_OPTIONS, injuryIds)
      : ['- None selected (assume healthy unless notes say otherwise)']),
    ...(a.injuryNotes.trim()
      ? [`\nUser injury / limitation notes: ${a.injuryNotes.trim()}`]
      : []),
    '',
    'Food allergies (multi — medical, not preference):',
    ...(allergyIds.length
      ? linesForIds(ALLERGY_OPTIONS, allergyIds)
      : ['- None selected (confirm no severe allergies unless user noted)']),
    ...(a.allergyOtherNotes.trim()
      ? [`Other allergy notes: ${a.allergyOtherNotes.trim()}`]
      : []),
    '',
    'Equipment available (multi):',
    ...(a.equipment.length
      ? linesForIds(EQUIPMENT_OPTIONS, a.equipment)
      : ['- (none selected — assume minimal)']),
    '',
    'Eating pattern (single):',
    pattern
      ? `- ${pattern.label}: ${pattern.ai}`
      : '- (not specified)',
    '',
    'Diet modifiers (multi, optional):',
    ...(a.dietModifiers.length
      ? linesForIds(DIET_MODIFIER_OPTIONS, a.dietModifiers)
      : ['- None']),
    '',
    'Meal style & prep preferences (multi, optional):',
    ...(a.foodPreferences.length
      ? linesForIds(FOOD_PREFERENCE_OPTIONS, a.foodPreferences)
      : ['- None specified']),
    '',
    ...(a.dietOtherNotes.trim()
      ? [
          'Extra diet / cultural / flexible-pattern notes:',
          a.dietOtherNotes.trim(),
          '',
        ]
      : []),
    'Training days per week (single):',
    days
      ? `- ${days.label}: ${days.ai}`
      : '- (not specified)',
    '',
    'Preferred training times (multi):',
    ...(a.trainingTimePrefs.length
      ? linesForIds(TRAINING_TIME_OPTIONS, a.trainingTimePrefs)
      : ['- Flexible / not specified']),
  ];
  return parts.join('\n');
}
