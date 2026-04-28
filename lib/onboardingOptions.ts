/** Stable IDs sent to the AI; labels are user-facing. */

export const GOAL_OPTIONS = [
  {
    id: 'lose_fat',
    label: 'Lose fat',
    ai: 'Prioritize sustainable caloric deficit with high protein to protect muscle.',
  },
  {
    id: 'build_muscle',
    label: 'Build muscle',
    ai: 'Prioritize hypertrophy-friendly training volume and a slight caloric surplus or maintenance+.',
  },
  {
    id: 'recomp',
    label: 'Recomposition',
    ai: 'Balance fat loss and muscle retention with moderate deficit and progressive overload (slower than a pure cut or bulk).',
  },
  {
    id: 'performance',
    label: 'Athletic performance',
    ai: 'Emphasize power, conditioning, and sport-specific energy demands.',
  },
  {
    id: 'general_health',
    label: 'General health',
    ai: 'Balanced movement, sustainable habits, no extreme restriction.',
  },
  {
    id: 'more_energy',
    label: 'Energy & daily routine',
    ai: 'Emphasize sustainable energy: sleep-friendly nutrition, meal timing, and a training load that fits a busy schedule.',
  },
] as const;

/** Single choice — one primary training background. */
export const EXPERIENCE_OPTIONS = [
  {
    id: 'new_training',
    label: 'New to structured training',
    ai: 'Foundational movement patterns; gradual progression; extra exercise notes.',
  },
  {
    id: 'lt_six_months',
    label: 'Under 6 months of training',
    ai: 'Novice–early intermediate progression; moderate volume.',
  },
  {
    id: 'six_to_two_years',
    label: '6 months – 2 years',
    ai: 'Intermediate programming; moderate intensity and accessories.',
  },
  {
    id: 'two_plus_years',
    label: '2+ years consistent',
    ai: 'Advanced volume and intensity tolerance; periodization-friendly.',
  },
  {
    id: 'returning',
    label: 'Returning after a break',
    ai: 'Ramp volume carefully; joint-friendly variations first.',
  },
  {
    id: 'former_athlete',
    label: 'Former competitive athlete',
    ai: 'High motor learning capacity; may tolerate higher workloads if desired.',
  },
] as const;

export const EQUIPMENT_OPTIONS = [
  {
    id: 'full_commercial_gym',
    label: 'Gym access',
    ai: 'Full commercial gym available: machines, cables, barbells, dumbbells, benches, and cardio equipment.',
  },
  {
    id: 'home_barbell_rack',
    label: 'Home gym: barbell + rack',
    ai: 'Home strength setup with squat rack, barbell, plates, and bench.',
  },
  {
    id: 'dumbbells_only',
    label: 'Dumbbells / adjustable bench',
    ai: 'Dumbbells available, with or without an adjustable bench; substitute barbell lifts with dumbbell equivalents.',
  },
  {
    id: 'kettlebells',
    label: 'Kettlebells',
    ai: 'Kettlebells available for swings, goblet squats, presses, carries, and conditioning.',
  },
  {
    id: 'bands',
    label: 'Bands / suspension trainer',
    ai: 'Resistance bands and/or suspension trainer available for rows, presses, pull-aparts, assisted work, and hinge patterns.',
  },
  {
    id: 'bodyweight',
    label: 'No equipment / bodyweight only',
    ai: 'No reliable training equipment; use bodyweight progressions and household-friendly movements.',
  },
  {
    id: 'cardio_equipment',
    label: 'Cardio machine access',
    ai: 'Bike, treadmill, rower, stair machine, or similar available for conditioning.',
  },
  {
    id: 'minimal_home',
    label: 'Small home setup / limited gear',
    ai: 'Limited home setup with one or two small tools; keep programming flexible and avoid assuming a full rack or full dumbbell set.',
  },
] as const;

const BODYWEIGHT_ONLY_EQUIPMENT_ID = 'bodyweight';

export function isEquipmentOptionDisabled(
  selectedIds: readonly string[],
  optionId: string
): boolean {
  if (selectedIds.includes(optionId)) return false;

  const hasBodyweightOnly = selectedIds.includes(BODYWEIGHT_ONLY_EQUIPMENT_ID);
  if (hasBodyweightOnly) return true;

  if (optionId === BODYWEIGHT_ONLY_EQUIPMENT_ID) {
    return selectedIds.length > 0;
  }

  return false;
}

/** Exactly one — base eating style (mutually exclusive in UI). */
export const DIET_PATTERN_OPTIONS = [
  { id: 'omnivore', label: 'Omnivore', ai: 'All protein sources; no dietary exclusions by default.' },
  { id: 'pescatarian', label: 'Pescatarian', ai: 'Fish/seafood + plants; no red meat or poultry.' },
  { id: 'vegetarian', label: 'Vegetarian', ai: 'Eggs/dairy OK; plant proteins; B12 awareness.' },
  { id: 'vegan', label: 'Vegan', ai: 'Plant protein variety; supplement considerations.' },
  {
    id: 'plant_forward',
    label: 'Mostly plant-based',
    ai: 'Emphasize plants with occasional animal protein; flexible templates.',
  },
  {
    id: 'other_flexible',
    label: 'Other / flexible',
    ai: 'Use dietOtherNotes from profile if present; else balanced omnivore-style meals with no strict exclusions.',
  },
] as const;

/** Multi, max 5 — stacks on top of diet pattern. */
export const DIET_MODIFIER_OPTIONS = [
  {
    id: 'high_protein',
    label: 'High-protein meals',
    ai: 'Prioritize protein at each meal and snack; use lean proteins and protein-rich swaps.',
  },
  {
    id: 'low_carb_pref',
    label: 'Lower-carb preference',
    ai: 'Prefer lower-carb meals with carbs kept moderate and placed around training when useful.',
  },
  {
    id: 'workout_carbs',
    label: 'More carbs around workouts',
    ai: 'Use carbs strategically before and after training to support performance and recovery.',
  },
  {
    id: 'halal',
    label: 'Halal',
    ai: 'Islamic dietary law: permitted proteins, no pork or alcohol in ingredients; avoid cross-contamination where relevant.',
  },
  {
    id: 'kosher',
    label: 'Kosher',
    ai: 'Kosher dietary law: respect meat/dairy separation and permitted species; note user may add detail in diet notes.',
  },
  { id: 'dairy_free', label: 'Dairy-free', ai: 'Avoid whey/dairy; use alternatives.' },
  { id: 'gluten_free', label: 'Gluten-free', ai: 'No wheat/barley/rye; GF carb sources.' },
] as const;

const LOWER_CARB_DIET_MODIFIER_ID = 'low_carb_pref';
const WORKOUT_CARBS_DIET_MODIFIER_ID = 'workout_carbs';

export function isDietModifierOptionDisabled(
  selectedIds: readonly string[],
  optionId: string
): boolean {
  if (selectedIds.includes(optionId)) return false;
  if (
    optionId === LOWER_CARB_DIET_MODIFIER_ID &&
    selectedIds.includes(WORKOUT_CARBS_DIET_MODIFIER_ID)
  ) {
    return true;
  }
  if (
    optionId === WORKOUT_CARBS_DIET_MODIFIER_ID &&
    selectedIds.includes(LOWER_CARB_DIET_MODIFIER_ID)
  ) {
    return true;
  }
  return false;
}

/** Multi-select meal style & prep preferences (see `MAX_FOOD_PREFERENCE_SELECTIONS`). */
export const MAX_FOOD_PREFERENCE_SELECTIONS = 6;

export const FOOD_PREFERENCE_OPTIONS = [
  {
    id: 'pref_simple_familiar',
    label: 'Simple & familiar',
    ai: 'Prefer straightforward recipes and familiar flavors; avoid “chef-y” or exotic ingredients by default.',
  },
  {
    id: 'pref_spice_ok',
    label: 'Bold & spicy OK',
    ai: 'Heat, strong spices, and punchy flavors are welcome when they fit the diet pattern.',
  },
  {
    id: 'pref_quick_prep',
    label: 'Quick & easy prep',
    ai: 'Prioritize shorter cook times, fewer steps, and minimal cleanup.',
  },
  {
    id: 'pref_meal_prep',
    label: 'Meal-prep friendly',
    ai: 'Batch-cook friendly templates; leftovers and repeatable lunches are a plus.',
  },
  {
    id: 'pref_bowls_salads',
    label: 'Bowls, salads & lighter plates',
    ai: 'Lean on grain bowls, big salads, and lighter plate-style meals when appropriate.',
  },
  {
    id: 'pref_family_portions',
    label: 'Family-style portions',
    ai: 'Favor shared mains, simple sides, and portions that work for households or bigger eaters.',
  },
] as const;

const FOOD_PREFERENCE_ID_SET: Set<string> = new Set(
  FOOD_PREFERENCE_OPTIONS.map((o) => o.id)
);

/** Drops unknown legacy ids after option list changes. */
export function sanitizeFoodPreferenceIds(ids: string[] | undefined | null): string[] {
  if (!ids?.length) return [];
  return ids
    .filter((id) => FOOD_PREFERENCE_ID_SET.has(id))
    .slice(0, MAX_FOOD_PREFERENCE_SELECTIONS);
}

/** Single — training days per week. */
export const TRAINING_DAYS_OPTIONS = [
  {
    id: 'one_two_sessions',
    label: '1–2 days / week',
    ai: 'Low frequency; full-body or minimal split; prioritize compounds and recovery between sessions.',
  },
  {
    id: 'two_three_sessions',
    label: '2–3 days / week',
    ai: 'Full-body or upper/lower; fewer but fuller sessions.',
  },
  {
    id: 'four_sessions',
    label: '4 days / week',
    ai: 'Upper/lower or push/pull + legs style split.',
  },
  {
    id: 'five_sessions',
    label: '5 days / week',
    ai: 'Bro split or PPL variants; watch recovery.',
  },
  {
    id: 'six_sessions',
    label: '6 days / week',
    ai: 'High frequency; deload and sleep critical.',
  },
] as const;

const TIME_WINDOW_IDS = ['morning_workouts', 'midday_workouts', 'evening_workouts'] as const;

export const TRAINING_TIME_OPTIONS = [
  {
    id: 'flexible_training',
    label: 'Flexible — any time',
    ai: 'No fixed window; schedule sessions whenever.',
  },
  {
    id: 'morning_workouts',
    label: 'Mornings',
    ai: 'Train early; note pre-workout fueling.',
  },
  {
    id: 'midday_workouts',
    label: 'Midday / lunch',
    ai: 'Meal timing around noon sessions.',
  },
  {
    id: 'evening_workouts',
    label: 'Evenings',
    ai: 'After work; prioritize post-workout dinner and recovery.',
  },
  {
    id: 'weekend_heavy',
    label: 'Stack harder on weekends',
    ai: 'Longer or harder sessions Sat/Sun if weekdays are tight.',
  },
] as const;

export function isTrainingTimeWindowId(id: string): boolean {
  return (TIME_WINDOW_IDS as readonly string[]).includes(id);
}

/** Inclusive; used only for nutrition estimates — copy stays respectful. */
export const SEX_OPTIONS = [
  {
    id: 'sex_woman',
    label: 'Woman',
    ai: 'Use female-typical BMR/energy estimation priors; avoid gendered assumptions in coaching copy.',
  },
  {
    id: 'sex_man',
    label: 'Man',
    ai: 'Use male-typical BMR/energy estimation priors; avoid gendered assumptions in coaching copy.',
  },
  {
    id: 'sex_nonbinary',
    label: 'Non-binary',
    ai: 'Use middle-of-road energy estimates between typical male/female averages; use neutral language in copy.',
  },
  {
    id: 'sex_prefer_not',
    label: 'Prefer not to say',
    ai: 'Use conservative middle-of-road calorie estimates; do not assume sex-specific physiology in wording.',
  },
] as const;

export const SESSION_LENGTH_OPTIONS = [
  {
    id: 'session_30',
    label: 'Up to ~30 min',
    ai: 'Keep sessions compact: 4–6 movements, supersets OK, minimal fluff; prioritize compounds.',
  },
  {
    id: 'session_45',
    label: '~45 minutes',
    ai: 'Standard session: moderate exercise count with adequate warm-up cues.',
  },
  {
    id: 'session_60',
    label: '~60 minutes',
    ai: 'Full session: can include accessories and conditioning finisher.',
  },
  {
    id: 'session_75_plus',
    label: '75+ minutes',
    ai: 'Higher volume possible; still program deliberate rest and avoid junk volume.',
  },
] as const;

export const INJURY_NONE_ID = 'injury_none';

export const INJURY_LIMITATION_OPTIONS = [
  {
    id: INJURY_NONE_ID,
    label: 'None — no limits right now',
    ai: 'No injury-driven exercise substitutions required.',
  },
  {
    id: 'injury_lower_back',
    label: 'Lower back sensitivity',
    ai: 'Favor neutral spine, hinge variations, core bracing; avoid heavy axial load early; no aggressive good-mornings.',
  },
  {
    id: 'injury_knees',
    label: 'Knee issues',
    ai: 'Limit deep flexion under load initially; prefer box squats, split squats with control, bike over running; avoid jumping if painful.',
  },
  {
    id: 'injury_shoulders',
    label: 'Shoulder issues',
    ai: 'Limit overhead pressing volume; neutral-grip pressing, landmine, rows; gradual ROM.',
  },
  {
    id: 'injury_wrists',
    label: 'Wrist pain',
    ai: 'Neutral grips, fat grips or dumbbells instead of painful bar positions; limit front rack if needed.',
  },
  {
    id: 'injury_hips',
    label: 'Hip pain',
    ai: 'Modify deep squats/lunges; lateral work and glute med activation; avoid painful end ROM.',
  },
  {
    id: 'injury_neck',
    label: 'Neck / cervical',
    ai: 'Avoid loaded neck flexion/extension; careful loading on carries; no yoke-style pressure.',
  },
  {
    id: 'injury_cardio_limited',
    label: 'Cardio clearance limited',
    ai: 'Keep conditioning moderate; prefer low-impact; physician clearance if symptomatic.',
  },
] as const;

export const ALLERGY_NONE_ID = 'allergy_none';

export const ALLERGY_OPTIONS = [
  {
    id: ALLERGY_NONE_ID,
    label: 'No known food allergies',
    ai: 'No allergy-driven ingredient bans beyond user diet pattern.',
  },
  {
    id: 'allergy_peanuts',
    label: 'Peanuts',
    ai: 'Strictly exclude peanuts and peanut-derived ingredients; watch cross-contact language.',
  },
  {
    id: 'allergy_tree_nuts',
    label: 'Tree nuts',
    ai: 'Exclude almonds, walnuts, cashews, pecans, etc.; label swaps clearly.',
  },
  {
    id: 'allergy_shellfish',
    label: 'Shellfish',
    ai: 'Exclude shrimp, crab, lobster, mollusks; note fish may still be OK unless user avoids fish elsewhere.',
  },
  {
    id: 'allergy_fish',
    label: 'Fish (finfish)',
    ai: 'Exclude finfish; shellfish policy per other selections.',
  },
  {
    id: 'allergy_eggs',
    label: 'Eggs',
    ai: 'Exclude eggs and egg-containing products; suggest egg-free binds.',
  },
  {
    id: 'allergy_soy',
    label: 'Soy',
    ai: 'Exclude soy sauce, tofu, tempeh, edamame unless fermented soy clearly OK for user.',
  },
  {
    id: 'allergy_wheat_gluten',
    label: 'Wheat / gluten',
    ai: 'Strict gluten-free ingredient choices; note oats if sensitive.',
  },
  {
    id: 'allergy_dairy_allergy',
    label: 'Dairy (allergy)',
    ai: 'Exclude all dairy proteins (not just lactose); distinct from dairy-free preference.',
  },
  {
    id: 'allergy_sesame',
    label: 'Sesame',
    ai: 'Exclude sesame seeds/oil/tahini where relevant.',
  },
] as const;

export const NUTRITION_PACE_OPTIONS = [
  {
    id: 'pace_sustainable',
    label: 'Slow & sustainable',
    ai: 'Favor mild deficit/surplus (~0.25–0.5% bodyweight change/week idea); prioritize adherence.',
  },
  {
    id: 'pace_moderate',
    label: 'Moderate pace',
    ai: 'Balanced approach; noticeable but not extreme energy change vs maintenance estimate.',
  },
  {
    id: 'pace_aggressive',
    label: 'Faster results (harder)',
    ai: 'Steeper deficit or surplus acceptable only if protein/training protects muscle; warn on adherence.',
  },
  {
    id: 'pace_not_tracking',
    label: 'Not focused on scale speed',
    ai: 'Emphasize habits, performance, and how clothes feel vs aggressive weight delta.',
  },
] as const;

export const MEALS_PER_DAY_OPTIONS = [
  {
    id: 'meals_3',
    label: '3 meals',
    ai: 'Structure around breakfast, lunch, dinner; snacks optional light.',
  },
  {
    id: 'meals_3_snack',
    label: '3 meals + snack',
    ai: 'Add one planned snack; good for higher protein spread.',
  },
  {
    id: 'meals_4_5',
    label: '4–5 smaller meals',
    ai: 'Split protein across more feedings; lighter portions per sitting.',
  },
  {
    id: 'meals_2_large',
    label: '2 larger meals (e.g. IF-style)',
    ai: 'Condense calories into two main meals; ensure daily protein still hit.',
  },
] as const;

export const COOKING_SKILL_OPTIONS = [
  {
    id: 'cook_minimal',
    label: 'Minimal / mostly simple',
    ai: '5–20 min ideas, few ingredients, one-pan / microwave / assemble; avoid chef techniques.',
  },
  {
    id: 'cook_comfortable',
    label: 'Comfortable in the kitchen',
    ai: 'Standard recipes OK; moderate prep steps acceptable.',
  },
  {
    id: 'cook_enjoy',
    label: 'I like to cook',
    ai: 'Can include longer recipes, marinades, and batch steps if helpful.',
  },
] as const;

export const AGE_MIN = 16;
export const AGE_MAX = 90;

export function ageValues(): number[] {
  const out: number[] = [];
  for (let y = AGE_MIN; y <= AGE_MAX; y++) out.push(y);
  return out;
}

/** Total inches, 4'6" – 7'0". */
export const HEIGHT_INCHES_MIN = 54;
export const HEIGHT_INCHES_MAX = 84;

export function heightInchesValues(): number[] {
  const out: number[] = [];
  for (let h = HEIGHT_INCHES_MIN; h <= HEIGHT_INCHES_MAX; h++) out.push(h);
  return out;
}

export function formatHeightInchesLabel(totalInches: number): string {
  const ft = Math.floor(totalInches / 12);
  const inch = totalInches % 12;
  return `${ft}'${inch}" (${totalInches} in)`;
}

export const MAX_INJURY_SELECTIONS = 5;
export const MAX_ALLERGY_SELECTIONS = 6;

export const WEIGHT_LB_MIN = 80;
export const WEIGHT_LB_MAX = 400;

export function weightLbValues(): number[] {
  const out: number[] = [];
  for (let w = WEIGHT_LB_MIN; w <= WEIGHT_LB_MAX; w++) out.push(w);
  return out;
}

export type GoalId = (typeof GOAL_OPTIONS)[number]['id'];
export type ExperienceId = (typeof EXPERIENCE_OPTIONS)[number]['id'];
export type EquipmentId = (typeof EQUIPMENT_OPTIONS)[number]['id'];
export type DietPatternId = (typeof DIET_PATTERN_OPTIONS)[number]['id'];
export type DietModifierId = (typeof DIET_MODIFIER_OPTIONS)[number]['id'];
export type FoodPreferenceId = (typeof FOOD_PREFERENCE_OPTIONS)[number]['id'];
export type TrainingDaysId = (typeof TRAINING_DAYS_OPTIONS)[number]['id'];
export type TrainingTimeId = (typeof TRAINING_TIME_OPTIONS)[number]['id'];
export type SexId = (typeof SEX_OPTIONS)[number]['id'];
export type SessionLengthId = (typeof SESSION_LENGTH_OPTIONS)[number]['id'];
export type InjuryLimitationId = (typeof INJURY_LIMITATION_OPTIONS)[number]['id'];
export type AllergyId = (typeof ALLERGY_OPTIONS)[number]['id'];
export type NutritionPaceId = (typeof NUTRITION_PACE_OPTIONS)[number]['id'];
export type MealsPerDayId = (typeof MEALS_PER_DAY_OPTIONS)[number]['id'];
export type CookingSkillId = (typeof COOKING_SKILL_OPTIONS)[number]['id'];
