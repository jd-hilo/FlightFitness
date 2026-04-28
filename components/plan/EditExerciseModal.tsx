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
import { exerciseSchema } from '@/types/plan';
import type { Exercise } from '@/types/plan';

function parseIntSafe(s: string, fallback: number) {
  const n = parseInt(s.replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

type Props = {
  visible: boolean;
  exercise: Exercise | null;
  onClose: () => void;
  onSave: (exercise: Exercise) => void;
};

export function EditExerciseModal({ visible, exercise, onClose, onSave }: Props) {
  const insets = useSafeAreaInsets();
  const keyboardOffset = useKeyboardOffset();
  const [name, setName] = useState('');
  const [setsS, setSetsS] = useState('');
  const [reps, setReps] = useState('');
  const [restS, setRestS] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!exercise || !visible) return;
    setName(exercise.name);
    setSetsS(String(exercise.sets));
    setReps(exercise.reps);
    setRestS(String(exercise.restSec));
    setNotes(exercise.notes ?? '');
    setError(null);
  }, [exercise, visible]);

  const handleSave = () => {
    if (!exercise) return;
    const sets = Math.max(1, parseIntSafe(setsS, exercise.sets));
    const restSec = Math.max(0, parseIntSafe(restS, exercise.restSec));

    const next: Exercise = {
      ...exercise,
      name: name.trim() || exercise.name,
      sets,
      reps: reps.trim() || exercise.reps,
      restSec,
      notes: notes.trim() ? notes.trim() : undefined,
    };

    const parsed = exerciseSchema.safeParse(next);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid exercise');
      return;
    }
    setError(null);
    onSave(parsed.data);
  };

  if (!exercise) return null;

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
          <Text style={styles.headerTitle}>Edit exercise</Text>
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
            {
              paddingBottom: insets.bottom + 24 + keyboardOffset,
            },
          ]}>
          <Text style={styles.label}>Movement name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Exercise name"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            returnKeyType="done"
            blurOnSubmit
          />

          <Text style={styles.label}>Sets</Text>
          <TextInput
            style={styles.input}
            value={setsS}
            onChangeText={setSetsS}
            placeholder="e.g. 4"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            keyboardType="number-pad"
            returnKeyType="done"
            blurOnSubmit
          />

          <Text style={styles.label}>Reps</Text>
          <TextInput
            style={styles.input}
            value={reps}
            onChangeText={setReps}
            placeholder="e.g. 8-10 or AMRAP"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            returnKeyType="done"
            blurOnSubmit
          />

          <Text style={styles.label}>Rest (seconds)</Text>
          <TextInput
            style={styles.input}
            value={restS}
            onChangeText={setRestS}
            placeholder="e.g. 90"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            keyboardType="number-pad"
            returnKeyType="done"
            blurOnSubmit
          />

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Tempo, substitutions, cues…"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            multiline
            returnKeyType="done"
            blurOnSubmit
          />

          <Text style={styles.hint}>
            Changes apply to this week on your device. They do not call the AI to
            generate a new movement — adjust the details you want to follow.
          </Text>

          {error ? <Text style={styles.err}>{error}</Text> : null}
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
  inputMulti: { minHeight: 88, textAlignVertical: 'top' },
  hint: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 17,
  },
  err: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.error,
    marginTop: 12,
  },
});
