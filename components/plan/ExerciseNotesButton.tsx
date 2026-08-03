import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type Props = {
  /** Number of notes on this exercise. Prefer over `hasNotes` when available. */
  noteCount?: number;
  /** @deprecated Use `noteCount` instead. */
  hasNotes?: boolean;
  onPress: () => void;
  size?: number;
};

export function ExerciseNotesButton({
  noteCount,
  hasNotes = false,
  onPress,
  size = 20,
}: Props) {
  const count = noteCount ?? (hasNotes ? 1 : 0);
  const label =
    count > 0
      ? count === 1
        ? 'Edit note'
        : `Edit notes, ${count}`
      : 'Add note';

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
      accessibilityLabel={label}
      accessibilityRole="button">
      <MaterialIcons
        name="edit"
        size={size}
        color={count > 0 ? theme.colors.gold : theme.colors.onSurfaceVariant}
      />
      {count > 0 ? (
        <View style={styles.badge} accessibilityElementsHidden>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : String(count)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: { opacity: 0.6 },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 14,
    height: 14,
    paddingHorizontal: 3,
    borderRadius: 7,
    backgroundColor: theme.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    lineHeight: 11,
    color: theme.colors.onGold,
  },
});
