import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardOffset } from '@/lib/useKeyboardOffset';
import { theme } from '@/constants/theme';

type Props = {
  visible: boolean;
  exerciseName: string;
  notes: string;
  onClose: () => void;
  onSave: (notes: string | undefined) => void;
};

export function ExerciseNotesModal({
  visible,
  exerciseName,
  notes: initialNotes,
  onClose,
  onSave,
}: Props) {
  const insets = useSafeAreaInsets();
  const keyboardOffset = useKeyboardOffset();
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!visible) return;
    setNotes(initialNotes);
  }, [initialNotes, visible]);

  const handleSave = () => {
    const trimmed = notes.trim();
    onSave(trimmed.length > 0 ? trimmed : undefined);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.sheet, { paddingTop: insets.top + 8 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 52 : 0}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.headerBtn}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Notes</Text>
          <Pressable onPress={handleSave} hitSlop={12}>
            <Text style={styles.headerBtnPrimary}>Save</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollFlex}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentContainerStyle={[
            styles.body,
            { paddingBottom: insets.bottom + 24 + keyboardOffset },
          ]}>
          <Text style={styles.exerciseName}>{exerciseName}</Text>
          <Text style={styles.label}>Note</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Tempo, substitutions, cues…"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            multiline
            autoFocus
            returnKeyType="done"
            submitBehavior="blurAndSubmit"
          />
          <Text style={styles.hint}>
            Saved with this exercise. Visible during your workout.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: theme.colors.background },
  scrollFlex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  headerTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 14,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  headerBtn: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  headerBtnPrimary: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    color: theme.colors.gold,
    letterSpacing: 1,
  },
  body: { paddingHorizontal: 20, paddingTop: 16 },
  exerciseName: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 16,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginBottom: 20,
  },
  label: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 14,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.colors.onBackground,
    marginBottom: 16,
  },
  inputMulti: { minHeight: 120, textAlignVertical: 'top' },
  hint: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 17,
  },
});
