import { useEffect } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image, StyleSheet, View } from 'react-native';

import { getExerciseCatalogEntry } from '@/data/exerciseCatalog';
import { theme } from '@/constants/theme';
import { isWgerCatalogId } from '@/lib/wgerCatalog';
import { useExerciseCatalogStore } from '@/stores/exerciseCatalogStore';

type Props = {
  catalogExerciseId?: string;
  thumbnailUrl?: string | null;
  iconKey?: string;
  size?: number;
  color?: string;
};

const FALLBACK_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  'healthicons:exercise': 'fitness-center',
  'healthicons:running': 'directions-run',
  'healthicons:weights': 'fitness-center',
};

function resolveMaterialIcon(
  catalogExerciseId?: string,
  iconKey?: string
): keyof typeof MaterialIcons.glyphMap {
  const fromCatalog = catalogExerciseId
    ? getExerciseCatalogEntry(catalogExerciseId)?.iconKey
    : undefined;
  const key = iconKey ?? fromCatalog ?? 'healthicons:exercise';
  return FALLBACK_ICONS[key] ?? 'fitness-center';
}

export function ExerciseIcon({
  catalogExerciseId,
  thumbnailUrl: thumbnailUrlProp,
  iconKey,
  size = 22,
  color = theme.colors.gold,
}: Props) {
  const thumbnailUrlFromStore = useExerciseCatalogStore((s) =>
    catalogExerciseId && isWgerCatalogId(catalogExerciseId)
      ? s.summariesById[catalogExerciseId]?.thumbnailUrl ?? null
      : null
  );
  const thumbnailUrl = thumbnailUrlProp ?? thumbnailUrlFromStore;
  const prefetchExerciseDetails = useExerciseCatalogStore((s) => s.prefetchExerciseDetails);

  useEffect(() => {
    if (!catalogExerciseId || thumbnailUrl) return;
    if (!isWgerCatalogId(catalogExerciseId)) return;
    void prefetchExerciseDetails([catalogExerciseId]);
  }, [catalogExerciseId, prefetchExerciseDetails, thumbnailUrl]);

  if (thumbnailUrl) {
    return (
      <View style={[styles.wrap, { width: size + 8, height: size + 8 }]}>
        <Image
          source={{ uri: thumbnailUrl }}
          style={{ width: size, height: size, borderRadius: 6 }}
          resizeMode="cover"
        />
      </View>
    );
  }

  const name = resolveMaterialIcon(catalogExerciseId, iconKey);
  return (
    <View style={[styles.wrap, { width: size + 8, height: size + 8 }]}>
      <MaterialIcons name={name} size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
