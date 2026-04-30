import {
  ALLERGY_NONE_ID,
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
  ALLERGY_OPTIONS,
  formatHeightInchesLabel,
} from '@/lib/onboardingOptions';
import type { OnboardingAnswers } from '@/types/plan';

export type ProfileSectionSummary = { title: string; lines: string[] };

function labelFor<T extends { id: string; label: string }>(
  options: readonly T[],
  id: string
): string {
  const found = options.find((o) => o.id === id)?.label;
  if (found) return found;
  return id.length > 0 ? id : 'Not set';
}

function labelsFor<T extends { id: string; label: string }>(
  options: readonly T[],
  ids: string[]
): string[] {
  return ids.map((id) => labelFor(options, id));
}

export function getProfileSectionSummaries(
  answers: OnboardingAnswers
): ProfileSectionSummary[] {
  const equipmentLabels = labelsFor(EQUIPMENT_OPTIONS, answers.equipment);
  const modLabels = labelsFor(DIET_MODIFIER_OPTIONS, answers.dietModifiers);
  const foodLabels = labelsFor(FOOD_PREFERENCE_OPTIONS, answers.foodPreferences);
  const injuryIds = answers.injuryLimitationIds.filter(
    (id) => id !== INJURY_NONE_ID
  );
  const injuryLabels = labelsFor(INJURY_LIMITATION_OPTIONS, injuryIds);
  const allergyIds = answers.allergyIds.filter((id) => id !== ALLERGY_NONE_ID);
  const allergyLabels = labelsFor(ALLERGY_OPTIONS, allergyIds);
  const timeLabels = labelsFor(TRAINING_TIME_OPTIONS, answers.trainingTimePrefs);

  return [
    {
      title: 'Main goal',
      lines: labelsFor(GOAL_OPTIONS, answers.goal),
    },
    {
      title: 'About you',
      lines: [
        answers.firstName.trim()
          ? `First name: ${answers.firstName.trim()}`
          : 'First name: Not set',
        `Sex: ${labelFor(SEX_OPTIONS, answers.sex)}`,
        `Age: ${answers.ageYears} yrs`,
        `Height: ${formatHeightInchesLabel(answers.heightInches)}`,
        `Weight: ${answers.currentWeightLb} lb → ${answers.targetWeightLb} lb`,
      ],
    },
    {
      title: 'Training',
      lines: [
        `Experience: ${labelFor(EXPERIENCE_OPTIONS, answers.experience)}`,
        equipmentLabels.length
          ? `Equipment: ${equipmentLabels.join(', ')}`
          : 'Equipment: Not set',
        `Typical session: ${labelFor(SESSION_LENGTH_OPTIONS, answers.sessionLengthId)}`,
        injuryLabels.length
          ? `Limitations: ${injuryLabels.join(', ')}`
          : 'Limitations: None selected',
        answers.injuryNotes.trim()
          ? `Injury notes: ${answers.injuryNotes.trim()}`
          : 'Injury notes: —',
      ],
    },
    {
      title: 'Diet',
      lines: [
        `Pattern: ${labelFor(DIET_PATTERN_OPTIONS, answers.dietPattern)}`,
        modLabels.length
          ? `Add-ons: ${modLabels.join(', ')}`
          : 'Add-ons: —',
        foodLabels.length
          ? `Tastes & style: ${foodLabels.join(', ')}`
          : 'Tastes & style: —',
        answers.dietOtherNotes.trim()
          ? `Other food notes: ${answers.dietOtherNotes.trim()}`
          : 'Other food notes: —',
      ],
    },
    {
      title: 'Allergies',
      lines: [
        allergyLabels.length
          ? allergyLabels.join(', ')
          : labelFor(ALLERGY_OPTIONS, ALLERGY_NONE_ID),
        answers.allergyOtherNotes.trim()
          ? `Other: ${answers.allergyOtherNotes.trim()}`
          : 'Other: —',
      ],
    },
    {
      title: 'Schedule',
      lines: [
        `Days per week: ${labelFor(TRAINING_DAYS_OPTIONS, answers.trainingDaysPerWeek)}`,
        timeLabels.length
          ? `When: ${timeLabels.join(', ')}`
          : 'When: Not set',
      ],
    },
    {
      title: 'Nutrition & kitchen',
      lines: [
        `Pace: ${labelFor(NUTRITION_PACE_OPTIONS, answers.nutritionPaceId)}`,
        `Meals: ${labelFor(MEALS_PER_DAY_OPTIONS, answers.mealsPerDayId)}`,
        `Cooking: ${labelFor(COOKING_SKILL_OPTIONS, answers.cookingSkillId)}`,
      ],
    },
  ];
}
