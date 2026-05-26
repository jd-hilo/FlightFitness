import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, View } from 'react-native';

import { getExerciseCatalogEntry } from '@/data/exerciseCatalog';
import { theme } from '@/constants/theme';

type Props = {
  catalogExerciseId?: string;
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
  iconKey,
  size = 22,
  color = theme.colors.gold,
}: Props) {
  const name = resolveMaterialIcon(catalogExerciseId, iconKey);
  return (
    <View style={styles.wrap}>
      <MaterialIcons name={name} size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
