import type { OnboardingAnswers } from '@/types/plan';
import {
  DIET_MODIFIER_OPTIONS,
  DIET_PATTERN_OPTIONS,
  EQUIPMENT_OPTIONS,
  EXPERIENCE_OPTIONS,
  FOOD_PREFERENCE_OPTIONS,
  GOAL_OPTIONS,
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

/** Rich text block for the AI (and optional server logs). */
export function summarizeOnboardingForAI(a: OnboardingAnswers): string {
  const delta = a.targetWeightLb - a.currentWeightLb;
  const goal = labelFor(GOAL_OPTIONS, a.goal);
  const exp = labelFor(EXPERIENCE_OPTIONS, a.experience);
  const pattern = labelFor(DIET_PATTERN_OPTIONS, a.dietPattern);
  const days = labelFor(TRAINING_DAYS_OPTIONS, a.trainingDaysPerWeek);

  const parts: string[] = [
    `Body: current ${a.currentWeightLb} lb → target ${a.targetWeightLb} lb (delta ${delta >= 0 ? '+' : ''}${delta} lb).`,
    '',
    'Primary goal (single):',
    goal
      ? `- ${goal.label}: ${goal.ai}`
      : '- (not specified)',
    '',
    'Training experience (single):',
    exp
      ? `- ${exp.label}: ${exp.ai}`
      : '- (not specified)',
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
    'Food preferences / dislikes / cuisines (multi, optional):',
    ...(a.foodPreferences.length
      ? linesForIds(FOOD_PREFERENCE_OPTIONS, a.foodPreferences)
      : ['- None specified']),
    '',
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
