import type { WeightLogEntry } from '@/stores/weightLogStore';

/** Entries for {@link WeightProgressChart}, including onboarding baseline when useful. */
export function buildWeightChartEntries(
  entries: WeightLogEntry[],
  onboardingWeight: number
): WeightLogEntry[] {
  if (entries.length === 0) {
    if (onboardingWeight > 0) {
      return [
        {
          dateKey: 'start',
          weightLb: onboardingWeight,
          updatedAt: 'onboarding-baseline',
        },
      ];
    }
    return [];
  }

  const hasStartPoint = entries.some(
    (e) => e.dateKey === 'start' || e.weightLb === onboardingWeight
  );
  if (onboardingWeight > 0 && !hasStartPoint) {
    return [
      {
        dateKey: 'start',
        weightLb: onboardingWeight,
        updatedAt: 'onboarding-baseline',
      },
      ...entries,
    ];
  }
  return entries;
}
