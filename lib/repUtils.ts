/** Parse first integer from reps string (handles legacy "8-10" → 8). */
export function parseTargetReps(reps: string | undefined): number {
  if (!reps?.trim()) return 10;
  const m = reps.match(/\d+/);
  return m ? Math.max(1, parseInt(m[0]!, 10)) : 10;
}

export const REP_VALUES = Array.from({ length: 30 }, (_, i) => i + 1);

export const WEIGHT_VALUES = Array.from({ length: 801 }, (_, i) => i * 2.5);
