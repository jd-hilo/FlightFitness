export type ExerciseCatalogEntry = {
  id: string;
  name: string;
  primaryMuscles: string[];
  equipment: string[];
  iconKey: string;
  aliases?: string[];
};

/** Bundled starter catalog — expand via scripts/ingest-exercise-icons.mjs */
export const EXERCISE_CATALOG: ExerciseCatalogEntry[] = [
  {
    id: 'barbell-bench-press',
    name: 'Barbell Bench Press',
    primaryMuscles: ['chest', 'triceps'],
    equipment: ['barbell', 'bench'],
    iconKey: 'healthicons:exercise',
    aliases: ['bench press', 'flat bench'],
  },
  {
    id: 'barbell-back-squat',
    name: 'Barbell Back Squat',
    primaryMuscles: ['quads', 'glutes'],
    equipment: ['barbell', 'rack'],
    iconKey: 'healthicons:exercise',
    aliases: ['back squat', 'squat'],
  },
  {
    id: 'conventional-deadlift',
    name: 'Conventional Deadlift',
    primaryMuscles: ['hamstrings', 'glutes', 'back'],
    equipment: ['barbell'],
    iconKey: 'healthicons:exercise',
    aliases: ['deadlift'],
  },
  {
    id: 'overhead-press',
    name: 'Overhead Press',
    primaryMuscles: ['shoulders', 'triceps'],
    equipment: ['barbell'],
    iconKey: 'healthicons:exercise',
    aliases: ['ohp', 'military press'],
  },
  {
    id: 'barbell-row',
    name: 'Barbell Row',
    primaryMuscles: ['back', 'biceps'],
    equipment: ['barbell'],
    iconKey: 'healthicons:exercise',
    aliases: ['bent over row'],
  },
  {
    id: 'pull-up',
    name: 'Pull-Up',
    primaryMuscles: ['back', 'biceps'],
    equipment: ['pull-up bar'],
    iconKey: 'healthicons:exercise',
    aliases: ['pullup', 'chin up'],
  },
  {
    id: 'dumbbell-lunge',
    name: 'Dumbbell Lunge',
    primaryMuscles: ['quads', 'glutes'],
    equipment: ['dumbbells'],
    iconKey: 'healthicons:exercise',
    aliases: ['lunges'],
  },
  {
    id: 'romanian-deadlift',
    name: 'Romanian Deadlift',
    primaryMuscles: ['hamstrings', 'glutes'],
    equipment: ['barbell', 'dumbbells'],
    iconKey: 'healthicons:exercise',
    aliases: ['rdl'],
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    primaryMuscles: ['back', 'biceps'],
    equipment: ['cable'],
    iconKey: 'healthicons:exercise',
  },
  {
    id: 'leg-press',
    name: 'Leg Press',
    primaryMuscles: ['quads', 'glutes'],
    equipment: ['machine'],
    iconKey: 'healthicons:exercise',
  },
  {
    id: 'dumbbell-curl',
    name: 'Dumbbell Curl',
    primaryMuscles: ['biceps'],
    equipment: ['dumbbells'],
    iconKey: 'healthicons:exercise',
    aliases: ['bicep curl'],
  },
  {
    id: 'tricep-pushdown',
    name: 'Tricep Pushdown',
    primaryMuscles: ['triceps'],
    equipment: ['cable'],
    iconKey: 'healthicons:exercise',
  },
  {
    id: 'plank',
    name: 'Plank',
    primaryMuscles: ['core'],
    equipment: ['bodyweight'],
    iconKey: 'healthicons:exercise',
  },
  {
    id: 'hip-thrust',
    name: 'Hip Thrust',
    primaryMuscles: ['glutes'],
    equipment: ['barbell', 'bench'],
    iconKey: 'healthicons:exercise',
  },
  {
    id: 'incline-dumbbell-press',
    name: 'Incline Dumbbell Press',
    primaryMuscles: ['chest', 'shoulders'],
    equipment: ['dumbbells', 'bench'],
    iconKey: 'healthicons:exercise',
  },
];

export function searchExerciseCatalog(query: string, limit = 8): ExerciseCatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return EXERCISE_CATALOG.slice(0, limit);
  return EXERCISE_CATALOG.filter((entry) => {
    if (entry.name.toLowerCase().includes(q)) return true;
    if (entry.aliases?.some((a) => a.toLowerCase().includes(q))) return true;
    if (entry.primaryMuscles.some((m) => m.includes(q))) return true;
    return false;
  }).slice(0, limit);
}

export function getExerciseCatalogEntry(id: string): ExerciseCatalogEntry | undefined {
  return EXERCISE_CATALOG.find((e) => e.id === id);
}
