import { useEffect, useMemo, useState } from 'react';
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

import { theme } from '@/constants/theme';
import { mealSchema } from '@/types/plan';
import type { Meal } from '@/types/plan';

function kcalFromMacros(proteinG: number, carbsG: number, fatG: number) {
  return Math.max(0, Math.round(4 * proteinG + 4 * carbsG + 9 * fatG));
}

function parseNum(s: string, fallback: number) {
  const n = parseFloat(s.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

type Props = {
  visible: boolean;
  meal: Meal | null;
  onClose: () => void;
  onSave: (meal: Meal) => void;
};

export function EditMealModal({ visible, meal, onClose, onSave }: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [proteinS, setProteinS] = useState('');
  const [carbsS, setCarbsS] = useState('');
  const [fatS, setFatS] = useState('');
  const [kcalS, setKcalS] = useState('');
  const [kcalManual, setKcalManual] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!meal || !visible) return;
    setName(meal.name);
    setDescription(meal.description);
    setProteinS(String(meal.macros.proteinG));
    setCarbsS(String(meal.macros.carbsG));
    setFatS(String(meal.macros.fatG));
    setKcalS(String(meal.macros.kcal));
    const sug = kcalFromMacros(
      meal.macros.proteinG,
      meal.macros.carbsG,
      meal.macros.fatG
    );
    setKcalManual(Math.abs(meal.macros.kcal - sug) > 15);
    setError(null);
  }, [meal, visible]);

  const p = parseNum(proteinS, 0);
  const c = parseNum(carbsS, 0);
  const f = parseNum(fatS, 0);
  const suggestedKcal = useMemo(() => kcalFromMacros(p, c, f), [p, c, f]);

  const syncKcalFromMacros = () => {
    setKcalS(String(suggestedKcal));
    setKcalManual(false);
  };

  const handleSave = () => {
    if (!meal) return;
    const proteinG = Math.max(0, p);
    const carbsG = Math.max(0, c);
    const fatG = Math.max(0, f);
    const kcal = kcalManual
      ? Math.max(0, parseNum(kcalS, suggestedKcal))
      : suggestedKcal;

    const next: Meal = {
      ...meal,
      name: name.trim() || meal.name,
      description: description.trim() || meal.description,
      macros: {
        proteinG,
        carbsG,
        fatG,
        kcal,
      },
    };

    const parsed = mealSchema.safeParse(next);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid meal');
      return;
    }
    setError(null);
    onSave(parsed.data);
  };

  if (!meal) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.sheet, { paddingTop: insets.top + 8 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.headerBtn}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Edit meal</Text>
          <Pressable onPress={handleSave} hitSlop={12}>
            <Text style={styles.headerBtnPrimary}>Save</Text>
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.body,
            { paddingBottom: insets.bottom + 24 },
          ]}>
          <View style={styles.slotPill}>
            <Text style={styles.slotTxt}>{meal.slot}</Text>
          </View>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Meal name"
            placeholderTextColor={theme.colors.onSurfaceVariant}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={description}
            onChangeText={setDescription}
            placeholder="What’s in it, prep notes…"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            multiline
          />

          <Text style={styles.label}>Macros</Text>
          <View style={styles.macroRow}>
            <View style={styles.macroField}>
              <Text style={styles.macroLbl}>Protein (g)</Text>
              <TextInput
                style={styles.input}
                value={proteinS}
                onChangeText={(t) => {
                  setProteinS(t);
                  if (!kcalManual) setKcalS(String(kcalFromMacros(parseNum(t, 0), c, f)));
                }}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.macroField}>
              <Text style={styles.macroLbl}>Carbs (g)</Text>
              <TextInput
                style={styles.input}
                value={carbsS}
                onChangeText={(t) => {
                  setCarbsS(t);
                  if (!kcalManual) setKcalS(String(kcalFromMacros(p, parseNum(t, 0), f)));
                }}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <View style={styles.macroRow}>
            <View style={styles.macroField}>
              <Text style={styles.macroLbl}>Fat (g)</Text>
              <TextInput
                style={styles.input}
                value={fatS}
                onChangeText={(t) => {
                  setFatS(t);
                  if (!kcalManual) setKcalS(String(kcalFromMacros(p, c, parseNum(t, 0))));
                }}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.macroField}>
              <Text style={styles.macroLbl}>Calories</Text>
              <TextInput
                style={styles.input}
                value={kcalS}
                onChangeText={(t) => {
                  setKcalManual(true);
                  setKcalS(t);
                }}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <Pressable style={styles.syncBtn} onPress={syncKcalFromMacros}>
            <Text style={styles.syncTxt}>
              Set calories from macros (~{suggestedKcal} kcal)
            </Text>
          </Pressable>

          <Text style={styles.hint}>
            Logged totals on the dashboard use each meal’s macros. Editing here updates
            those sums as soon as you save.
          </Text>

          {error ? <Text style={styles.err}>{error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: theme.colors.background },
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
  slotPill: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.gold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 16,
  },
  slotTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 1,
    color: theme.colors.onGold,
    textTransform: 'uppercase',
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
  macroRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  macroField: { flex: 1 },
  macroLbl: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  syncBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    marginBottom: 12,
  },
  syncTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    color: theme.colors.gold,
    letterSpacing: 0.5,
    textDecorationLine: 'underline',
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
