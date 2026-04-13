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
    label: 'More energy & habits',
    ai: 'Focus on sleep-friendly nutrition, consistent meal timing, and manageable training load.',
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
    label: 'Under 6 months',
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
  { id: 'full_commercial_gym', label: 'Full commercial gym', ai: 'All machines, cables, free weights.' },
  { id: 'home_barbell_rack', label: 'Home barbell + rack', ai: 'Squat rack, barbell, adjustable bench.' },
  { id: 'dumbbells_only', label: 'Dumbbells only', ai: 'Substitute barbell lifts with dumbbell equivalents.' },
  { id: 'kettlebells', label: 'Kettlebells', ai: 'KB swings, goblet squats, carries.' },
  { id: 'bands', label: 'Resistance bands', ai: 'Band presses, rows, pull-aparts, hinge patterns.' },
  { id: 'bodyweight', label: 'Bodyweight only', ai: 'Push-up / pull-up / squat / lunge progressions.' },
  { id: 'cardio_equipment', label: 'Cardio equipment', ai: 'Bike, treadmill, or rower for conditioning.' },
  { id: 'minimal_home', label: 'Minimal home (1–2 tools)', ai: 'Very limited equipment; creative supersets.' },
] as const;

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
  { id: 'other_flexible', label: 'Other / flexible', ai: 'User will clarify in modifiers; default balanced omnivore-style swaps.' },
] as const;

/** Multi, max 5 — stacks on top of diet pattern. */
export const DIET_MODIFIER_OPTIONS = [
  { id: 'high_protein', label: 'Extra protein priority', ai: 'Emphasize lean protein at each meal.' },
  { id: 'low_carb_pref', label: 'Lower-carb preference', ai: 'Favor protein/fats; moderate carbs around training.' },
  { id: 'halal_kosher', label: 'Halal / Kosher style', ai: 'Respect protein sourcing and preparation constraints.' },
  { id: 'dairy_free', label: 'Dairy-free', ai: 'Avoid whey/dairy; use alternatives.' },
  { id: 'gluten_free', label: 'Gluten-free', ai: 'No wheat/barley/rye; GF carb sources.' },
] as const;

/** Multi, max 5 — dislikes & cuisine lean for meal variety. */
export const FOOD_PREFERENCE_OPTIONS = [
  { id: 'dislike_fish', label: 'Avoid fish / seafood', ai: 'No fish or shellfish in meal ideas.' },
  { id: 'dislike_red_meat', label: 'Avoid red meat', ai: 'Prefer poultry, fish, or plant proteins.' },
  { id: 'dislike_spicy', label: 'Mild / no spicy', ai: 'Keep heat low; avoid hot peppers and heavy spice.' },
  { id: 'dislike_mushrooms', label: 'No mushrooms', ai: 'Exclude mushrooms from recipes.' },
  { id: 'dislike_cilantro', label: 'No cilantro', ai: 'Avoid cilantro as garnish or ingredient.' },
  { id: 'cuisine_mexican', label: 'Love Mexican / Latin', ai: 'Lean on beans, rice, salsas, grilled proteins.' },
  { id: 'cuisine_asian', label: 'Love Asian flavors', ai: 'Stir-fry, rice/noodle bowls, soy-ginger profiles.' },
  { id: 'cuisine_mediterranean', label: 'Love Mediterranean', ai: 'Olive oil, yogurt, legumes, grilled meats/fish.' },
  {
    id: 'cuisine_american',
    label: 'Simple / American comfort',
    ai: 'Grilled proteins, potatoes, salads, straightforward prep.',
  },
  { id: 'quick_meals', label: 'Quick meals (≤20 min)', ai: 'Prioritize short cook times and minimal steps.' },
  { id: 'meal_prep', label: 'Meal-prep friendly', ai: 'Batch-cook friendly recipes and repeat lunches.' },
] as const;

/** Single — training days per week. */
export const TRAINING_DAYS_OPTIONS = [
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
