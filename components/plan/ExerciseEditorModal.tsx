import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseIcon } from '@/components/plan/ExerciseIcon';
import { NumberStepper } from '@/components/plan/NumberStepper';
import { theme } from '@/constants/theme';
import {
  defaultSetRow,
  ensureExerciseSetRows,
  newId,
  syncExerciseAggregateFromSetRows,
} from '@/lib/exerciseNormalize';
import { useKeyboardOffset } from '@/lib/useKeyboardOffset';
import { parseTargetReps } from '@/lib/repUtils';
import { exerciseSchema } from '@/types/plan';
import type { Exercise, ExerciseSetRow } from '@/types/plan';
import {
  useExerciseCatalogStore,
  type ExerciseCatalogSearchResult,
} from '@/stores/exerciseCatalogStore';

function parseIntSafe(s: string, fallback: number) {
  const n = parseInt(s.replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

type Props = {
  visible: boolean;
  mode: 'add' | 'edit';
  exercise: Exercise | null;
  dayIndex: number | null;
  exerciseIndex: number | null;
  onClose: () => void;
  onSave: (exercise: Exercise) => void;
  onDelete?: () => void;
};

export function ExerciseEditorModal({
  visible,
  mode,
  exercise,
  dayIndex,
  exerciseIndex,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const insets = useSafeAreaInsets();
  const keyboardOffset = useKeyboardOffset();
  const [name, setName] = useState('');
  const [catalogExerciseId, setCatalogExerciseId] = useState<string | undefined>();
  const [restS, setRestS] = useState('90');
  const [notes, setNotes] = useState('');
  const [setRows, setSetRows] = useState<ExerciseSetRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (mode === 'edit' && exercise) {
      const normalized = ensureExerciseSetRows(exercise);
      setName(normalized.name);
      setCatalogExerciseId(normalized.catalogExerciseId);
      setRestS(String(normalized.restSec));
      setNotes(normalized.notes ?? '');
      setSetRows(normalized.setRows ?? []);
    } else {
      setName('');
      setCatalogExerciseId(undefined);
      setRestS('90');
      setNotes('');
      setSetRows([
        defaultSetRow('10', 90),
        defaultSetRow('10', 90),
        defaultSetRow('10', 90),
      ]);
    }
    setError(null);
  }, [exercise, visible, mode]);

  const searchExercises = useExerciseCatalogStore((s) => s.searchExercises);
  const searchResults = useExerciseCatalogStore((s) => s.searchResults);
  const searchLoading = useExerciseCatalogStore((s) => s.searchLoading);
  const prefetchExerciseDetails = useExerciseCatalogStore((s) => s.prefetchExerciseDetails);
  const [debouncedName, setDebouncedName] = useState('');

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setDebouncedName(name), 250);
    return () => clearTimeout(timer);
  }, [name, visible]);

  useEffect(() => {
    if (!visible) return;
    void searchExercises(debouncedName);
  }, [debouncedName, searchExercises, visible]);

  useEffect(() => {
    if (!visible || !catalogExerciseId) return;
    void prefetchExerciseDetails([catalogExerciseId]);
  }, [catalogExerciseId, prefetchExerciseDetails, visible]);

  const catalogMatches = useMemo(() => searchResults, [searchResults]);

  const updateRow = (index: number, patch: Partial<ExerciseSetRow>) => {
    setSetRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    const reps = setRows[0]?.targetReps ?? '10';
    const rest = parseIntSafe(restS, 90);
    setSetRows((rows) => [...rows, defaultSetRow(reps, rest)]);
  };

  const removeRow = (index: number) => {
    setSetRows((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)));
  };

  const pickCatalogEntry = (entry: ExerciseCatalogSearchResult) => {
    setName(entry.name);
    setCatalogExerciseId(entry.id);
  };

  const handleSave = () => {
    const restSec = Math.max(0, parseIntSafe(restS, 90));
    const rows = setRows.map((row, i) => ({
      ...row,
      id: row.id || newId('set'),
      targetReps: String(parseTargetReps(row.targetReps)),
      restSec: row.restSec ?? restSec,
    }));
    const firstReps = rows[0]?.targetReps ?? '10';
    const next: Exercise = syncExerciseAggregateFromSetRows({
      id: exercise?.id ?? newId('ex'),
      name: name.trim() || 'Exercise',
      sets: rows.length,
      reps: firstReps,
      restSec,
      notes: notes.trim() ? notes.trim() : undefined,
      catalogExerciseId,
      supersetGroupId: exercise?.supersetGroupId,
      setRows: rows,
    });

    const parsed = exerciseSchema.safeParse(next);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid exercise');
      return;
    }
    setError(null);
    onSave(parsed.data);
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
          <Text style={styles.headerTitle}>
            {mode === 'add' ? 'Add exercise' : 'Edit exercise'}
          </Text>
          <Pressable onPress={handleSave} hitSlop={12}>
            <Text style={styles.headerBtnPrimary}>Save</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollFlex}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingBottom: insets.bottom + 24 + keyboardOffset,
            paddingHorizontal: 20,
            paddingTop: 16,
          }}>
          <View style={styles.nameRow}>
            <ExerciseIcon catalogExerciseId={catalogExerciseId} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Movement name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Search or type exercise"
                placeholderTextColor={theme.colors.onSurfaceVariant}
              />
            </View>
          </View>

          {(mode === 'add' || name.trim().length > 0) ? (
            <View style={styles.catalogBox}>
              {searchLoading ? (
                <View style={styles.catalogLoading}>
                  <ActivityIndicator size="small" color={theme.colors.gold} />
                </View>
              ) : null}
              {catalogMatches.map((entry) => (
                <Pressable
                  key={entry.id}
                  style={[
                    styles.catalogRow,
                    catalogExerciseId === entry.id && styles.catalogRowSelected,
                  ]}
                  onPress={() => pickCatalogEntry(entry)}>
                  <ExerciseIcon
                    catalogExerciseId={entry.id}
                    imageModule={entry.imageModule}
                    size={56}
                  />
                  <Text style={styles.catalogName} numberOfLines={2}>
                    {entry.name}
                  </Text>
                </Pressable>
              ))}
              {!searchLoading && catalogMatches.length === 0 ? (
                <Text style={styles.catalogEmpty}>No matches — type a custom name.</Text>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.label}>Default rest (seconds)</Text>
          <TextInput
            style={styles.input}
            value={restS}
            onChangeText={setRestS}
            keyboardType="number-pad"
          />

          <View style={styles.setHead}>
            <Text style={styles.label}>Sets</Text>
            <Text style={styles.setCount}>{setRows.length}</Text>
          </View>

          {setRows.map((row, i) => (
            <View key={row.id || i} style={styles.setCard}>
              <View style={styles.setCardHeader}>
                <View style={styles.setBadge}>
                  <Text style={styles.setBadgeText}>{i + 1}</Text>
                </View>
                <Text style={styles.setCardTitle}>Set {i + 1}</Text>
                {setRows.length > 1 ? (
                  <Pressable
                    onPress={() => removeRow(i)}
                    style={styles.setRemoveBtn}
                    hitSlop={8}>
                    <MaterialIcons
                      name="close"
                      size={16}
                      color={theme.colors.onSurfaceVariant}
                    />
                  </Pressable>
                ) : (
                  <View style={styles.setRemoveSpacer} />
                )}
              </View>
              <View style={styles.setFields}>
                <NumberStepper
                  label="Weight"
                  suffix="lb"
                  value={row.weightLb ?? 0}
                  onChange={(n) => updateRow(i, { weightLb: n || undefined })}
                  min={0}
                  max={500}
                  step={2.5}
                  allowKeyboardInput
                  keyboardType="decimal-pad"
                  compact
                />
                <NumberStepper
                  label="Reps"
                  value={parseTargetReps(row.targetReps)}
                  onChange={(n) => updateRow(i, { targetReps: String(n) })}
                  min={1}
                  max={50}
                  compact
                />
              </View>
            </View>
          ))}

          <Pressable style={styles.addSetBox} onPress={addRow}>
            <MaterialIcons name="add" size={20} color={theme.colors.gold} />
            <Text style={styles.addSetTxt}>Add set</Text>
          </Pressable>

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Tempo, substitutions, cues…"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            multiline
          />

          {onDelete ? (
            <Pressable style={styles.deleteBtn} onPress={onDelete}>
              <Text style={styles.deleteTxt}>Remove exercise</Text>
            </Pressable>
          ) : null}

          <Text style={styles.hint}>
            Set rows sync to your week plan and save to your account automatically.
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
  nameRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  catalogBox: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    marginBottom: 16,
    marginTop: -8,
  },
  catalogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 84,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineStrong,
  },
  catalogRowSelected: {
    backgroundColor: theme.colors.surfaceContainer,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.gold,
  },
  catalogName: {
    flex: 1,
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 17,
    lineHeight: 22,
    color: theme.colors.onBackground,
  },
  catalogSource: {
    fontFamily: theme.fonts.label,
    fontSize: 8,
    letterSpacing: 1,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  catalogThumb: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceContainer,
  },
  catalogLoading: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  catalogEmpty: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    padding: 12,
  },
  setHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  setCount: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  setCard: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerHigh,
    padding: 14,
    marginBottom: 10,
  },
  setCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  setBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setBadgeText: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 13,
    color: theme.colors.onGold,
  },
  setCardTitle: {
    flex: 1,
    fontFamily: theme.fonts.label,
    fontSize: 11,
    color: theme.colors.onBackground,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  setRemoveBtn: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceContainer,
  },
  setRemoveSpacer: { width: 28, height: 28 },
  setFields: { flexDirection: 'row', gap: 10 },
  addSetBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderStyle: 'dashed',
    backgroundColor: theme.colors.surfaceContainer,
    paddingVertical: 14,
    marginBottom: 16,
  },
  addSetTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    color: theme.colors.gold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  deleteBtn: { paddingVertical: 12, alignItems: 'center', marginBottom: 8 },
  deleteTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    color: theme.colors.error,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
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
