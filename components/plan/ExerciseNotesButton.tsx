import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import { theme } from '@/constants/theme';

type Props = {
  hasNotes?: boolean;
  onPress: () => void;
  size?: number;
};

export function ExerciseNotesButton({ hasNotes = false, onPress, size = 20 }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
      accessibilityLabel={hasNotes ? 'Edit note' : 'Add note'}
      accessibilityRole="button">
      <MaterialIcons
        name="edit"
        size={size}
        color={hasNotes ? theme.colors.gold : theme.colors.onSurfaceVariant}
      />
      {hasNotes ? <View style={styles.dot} /> : null}
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
  dot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.gold,
  },
});
