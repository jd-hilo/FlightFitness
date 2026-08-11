import { useEffect } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image, StyleSheet, View } from 'react-native';

import { getExerciseCatalogEntry } from '@/data/exerciseCatalog';
import { theme } from '@/constants/theme';
import { getRepdbImageModule } from '@/lib/api/repdbExerciseCatalog';
import { isRepdbCatalogId } from '@/lib/repdbCatalog';
import { useExerciseCatalogStore } from '@/stores/exerciseCatalogStore';

type Props = {
  catalogExerciseId?: string;
  /** Local Metro module from RepDB require() map */
  imageModule?: number | null;
  /** Remote URI (legacy); unused for RepDB */
  thumbnailUrl?: string | null;
  iconKey?: string;
  size?: number;
  color?: string;
  /** When false, render nothing unless a catalog image/thumbnail exists. */
  fallback?: boolean;
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
  imageModule: imageModuleProp,
  thumbnailUrl: thumbnailUrlProp,
  iconKey,
  size = 22,
  color = theme.colors.gold,
  fallback = true,
}: Props) {
  const imageModuleFromStore = useExerciseCatalogStore((s) =>
    catalogExerciseId && isRepdbCatalogId(catalogExerciseId)
      ? s.summariesById[catalogExerciseId]?.imageModule ?? null
      : null
  );
  const prefetchExerciseDetails = useExerciseCatalogStore((s) => s.prefetchExerciseDetails);

  const imageModule =
    imageModuleProp ??
    imageModuleFromStore ??
    (isRepdbCatalogId(catalogExerciseId)
      ? getRepdbImageModule(catalogExerciseId)
      : null);

  useEffect(() => {
    if (!catalogExerciseId || imageModule != null) return;
    if (!isRepdbCatalogId(catalogExerciseId)) return;
    void prefetchExerciseDetails([catalogExerciseId]);
  }, [catalogExerciseId, imageModule, prefetchExerciseDetails]);

  if (imageModule != null) {
    return (
      <View style={[styles.wrap, { width: size + 8, height: size + 8 }]}>
        <Image
          source={imageModule}
          style={{ width: size, height: size, borderRadius: 6 }}
          resizeMode="cover"
        />
      </View>
    );
  }

  if (thumbnailUrlProp) {
    return (
      <View style={[styles.wrap, { width: size + 8, height: size + 8 }]}>
        <Image
          source={{ uri: thumbnailUrlProp }}
          style={{ width: size, height: size, borderRadius: 6 }}
          resizeMode="cover"
        />
      </View>
    );
  }

  if (!fallback) return null;

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
