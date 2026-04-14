import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import type { Meal } from '@/types/plan';

type Props = {
  meal: Meal;
  completed: boolean;
  onToggleComplete: () => void;
  onEdit?: (meal: Meal) => void;
  readOnly?: boolean;
};

export function MealCard({
  meal,
  completed,
  onToggleComplete,
  onEdit,
  readOnly = false,
}: Props) {
  const canEdit = onEdit && !readOnly;
  return (
    <View style={[styles.row, readOnly && styles.rowReadOnly]}>
      <View style={styles.textCol}>
        <View style={styles.badgeRow}>
          <Text style={[styles.badge, readOnly && styles.badgeMuted]}>{meal.slot}</Text>
          {canEdit ? (
            <Pressable onPress={() => onEdit(meal)} hitSlop={8}>
              <Text style={styles.edit}>Edit</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={[styles.name, readOnly && styles.textMuted]}>{meal.name}</Text>
        <Text style={[styles.desc, readOnly && styles.descMuted]}>{meal.description}</Text>
        <View style={styles.macros}>
          <Macro label="Protein" value={`${meal.macros.proteinG}g`} gold={!readOnly} />
          <Macro label="Carbs" value={`${meal.macros.carbsG}g`} gold={!readOnly} />
          <Macro label="Fat" value={`${meal.macros.fatG}g`} gold={!readOnly} />
          <Macro label="Kcal" value={`${meal.macros.kcal}`} gold={!readOnly} />
        </View>
      </View>
      <Pressable
        onPress={readOnly ? undefined : onToggleComplete}
        disabled={readOnly}
        style={styles.checkHit}
        hitSlop={12}>
        {completed ? (
          <MaterialIcons
            name="check-circle"
            size={36}
            color={readOnly ? theme.colors.onSurfaceVariant : theme.colors.gold}
          />
        ) : (
          <View style={[styles.addBtn, readOnly && styles.addBtnMuted]}>
            <MaterialIcons
              name="add"
              size={28}
              color={readOnly ? theme.colors.onSurfaceVariant : theme.colors.onBackground}
            />
          </View>
        )}
      </Pressable>
    </View>
  );
}

function Macro({
  label,
  value,
  gold,
}: {
  label: string;
  value: string;
  gold?: boolean;
}) {
  return (
    <View>
      <Text style={styles.mLabel}>{label}</Text>
      <Text style={[styles.mVal, gold && styles.mValGold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.outlineStrong,
    padding: 20,
    marginBottom: 4,
    alignItems: 'flex-start',
  },
  rowReadOnly: {
    opacity: 0.55,
  },
  textMuted: {
    color: theme.colors.onSurfaceVariant,
  },
  descMuted: {
    opacity: 0.85,
  },
  badgeMuted: {
    opacity: 0.75,
  },
  addBtnMuted: {
    borderColor: theme.colors.outline,
    opacity: 0.8,
  },
  textCol: { flex: 1, paddingRight: 12 },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.gold,
    color: theme.colors.onGold,
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: 'uppercase',
    overflow: 'hidden',
  },
  edit: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  name: {
    fontFamily: theme.fonts.headline,
    fontSize: 22,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  desc: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  macros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  mLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  mVal: {
    fontFamily: theme.fonts.headline,
    fontSize: 18,
    color: theme.colors.onBackground,
  },
  mValGold: { color: theme.colors.gold },
  checkHit: { paddingTop: 4 },
  addBtn: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
