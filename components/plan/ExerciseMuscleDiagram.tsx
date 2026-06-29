import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RemoteSvg } from '@/components/plan/RemoteSvg';
import { theme } from '@/constants/theme';
import { isWgerCatalogId } from '@/lib/wgerCatalog';
import { useExerciseCatalogStore } from '@/stores/exerciseCatalogStore';
import type { WgerExerciseMuscle } from '@/lib/api/wgerExerciseCatalog';

const EMPTY_MUSCLES: WgerExerciseMuscle[] = [];

type Props = {
  catalogExerciseId?: string;
  compact?: boolean;
  maxMuscles?: number;
};

export function ExerciseMuscleDiagram({
  catalogExerciseId,
  compact = false,
  maxMuscles = 4,
}: Props) {
  const muscles = useExerciseCatalogStore((s) =>
    catalogExerciseId ? s.musclesByCatalogId[catalogExerciseId] ?? EMPTY_MUSCLES : EMPTY_MUSCLES
  );
  const prefetchExerciseDetails = useExerciseCatalogStore((s) => s.prefetchExerciseDetails);

  useEffect(() => {
    if (!catalogExerciseId || !isWgerCatalogId(catalogExerciseId)) return;
    void prefetchExerciseDetails([catalogExerciseId]);
  }, [catalogExerciseId, prefetchExerciseDetails]);

  if (!catalogExerciseId || !isWgerCatalogId(catalogExerciseId) || muscles.length === 0) {
    return null;
  }

  const size = compact ? 28 : 36;
  const shown = muscles.slice(0, maxMuscles);

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {shown.map((muscle) => {
        const uri = muscle.image_url_main ?? muscle.image_url_secondary;
        if (!uri) return null;
        const label = muscle.name_en?.trim() || muscle.name;
        return (
          <View key={`${muscle.id}-${muscle.is_primary ? 'p' : 's'}`} style={styles.item}>
            <RemoteSvg uri={uri} width={size} height={size} />
            {!compact ? (
              <Text style={styles.label} numberOfLines={1}>
                {label}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  rowCompact: {
    gap: 6,
    marginTop: 6,
  },
  item: {
    alignItems: 'center',
    maxWidth: 52,
  },
  label: {
    fontFamily: theme.fonts.label,
    fontSize: 8,
    letterSpacing: 0.4,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginTop: 4,
    textAlign: 'center',
  },
});
