import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef, useState, type ReactNode } from 'react';
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

import { NumberStepper } from '@/components/plan/NumberStepper';
import { theme } from '@/constants/theme';
import { newId } from '@/lib/exerciseNormalize';
import { useKeyboardOffset } from '@/lib/useKeyboardOffset';
import { mealSchema } from '@/types/plan';
import type { Meal, MealSlot, MealTemplate } from '@/types/plan';

function kcalFromMacros(proteinG: number, carbsG: number, fatG: number) {
  return Math.max(0, Math.round(4 * proteinG + 4 * carbsG + 9 * fatG));
}

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

type Props = {
  visible: boolean;
  mode: 'add' | 'edit';
  meal: Meal | null;
  mealTemplates?: MealTemplate[];
  onClose: () => void;
  onSave: (meal: Meal) => void;
  onDelete?: () => void;
};

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

export function MealEditorModal({
  visible,
  mode,
  meal,
  mealTemplates = [],
  onClose,
  onSave,
  onDelete,
}: Props) {
  const insets = useSafeAreaInsets();
  const keyboardOffset = useKeyboardOffset();
  const [slot, setSlot] = useState<MealSlot>('lunch');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [proteinG, setProteinG] = useState(30);
  const [carbsG, setCarbsG] = useState(40);
  const [fatG, setFatG] = useState(12);
  const [kcalManual, setKcalManual] = useState(false);
  const [kcal, setKcal] = useState(kcalFromMacros(30, 40, 12));
  const [kcalEditing, setKcalEditing] = useState(false);
  const [kcalDraft, setKcalDraft] = useState('');
  const kcalInputRef = useRef<TextInput>(null);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (meal) {
      setSlot(meal.slot);
      setName(meal.name);
      setDescription(meal.description);
      setProteinG(meal.macros.proteinG);
      setCarbsG(meal.macros.carbsG);
      setFatG(meal.macros.fatG);
      setKcal(meal.macros.kcal);
      const sug = kcalFromMacros(
        meal.macros.proteinG,
        meal.macros.carbsG,
        meal.macros.fatG
      );
      setKcalManual(Math.abs(meal.macros.kcal - sug) > 15);
    } else {
      setSlot('lunch');
      setName('');
      setDescription('');
      setProteinG(30);
      setCarbsG(40);
      setFatG(12);
      setKcal(kcalFromMacros(30, 40, 12));
      setKcalManual(false);
    }
    setError(null);
    setKcalEditing(false);
    setTemplateMenuOpen(false);
  }, [meal, visible, mode]);

  const suggestedKcal = kcalFromMacros(proteinG, carbsG, fatG);
  const displayKcal = kcalManual ? kcal : suggestedKcal;

  const updateProtein = (n: number) => {
    setProteinG(n);
    if (!kcalManual) setKcal(kcalFromMacros(n, carbsG, fatG));
  };

  const updateCarbs = (n: number) => {
    setCarbsG(n);
    if (!kcalManual) setKcal(kcalFromMacros(proteinG, n, fatG));
  };

  const updateFat = (n: number) => {
    setFatG(n);
    if (!kcalManual) setKcal(kcalFromMacros(proteinG, carbsG, n));
  };

  const startKcalEditing = () => {
    setKcalDraft(String(displayKcal));
    setKcalEditing(true);
    requestAnimationFrame(() => kcalInputRef.current?.focus());
  };

  const commitKcalDraft = () => {
    const parsed = parseInt(kcalDraft.replace(/[^0-9]/g, ''), 10);
    if (Number.isFinite(parsed)) {
      const clamped = Math.max(0, Math.min(5000, parsed));
      setKcalManual(true);
      setKcal(clamped);
    }
    setKcalEditing(false);
  };

  const applyTemplate = (template: MealTemplate) => {
    setSlot(template.slot);
    setName(template.name);
    setDescription(template.description);
    setProteinG(template.macros.proteinG);
    setCarbsG(template.macros.carbsG);
    setFatG(template.macros.fatG);
    setKcal(template.macros.kcal);
    const sug = kcalFromMacros(
      template.macros.proteinG,
      template.macros.carbsG,
      template.macros.fatG
    );
    setKcalManual(Math.abs(template.macros.kcal - sug) > 15);
    setTemplateMenuOpen(false);
    setError(null);
  };

  const buildMeal = (): Meal => ({
    id: mode === 'edit' && meal?.id ? meal.id : newId('meal'),
    slot,
    name: name.trim() || 'Meal',
    description: description.trim(),
    macros: {
      proteinG: Math.max(0, proteinG),
      carbsG: Math.max(0, carbsG),
      fatG: Math.max(0, fatG),
      kcal: Math.max(0, displayKcal),
    },
  });

  const handleSave = () => {
    const parsed = mealSchema.safeParse(buildMeal());
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid meal');
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
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.headerBtn}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>
            {mode === 'add' ? 'Add meal' : 'Edit meal'}
          </Text>
          <Pressable onPress={handleSave} hitSlop={12}>
            <Text style={styles.headerBtnPrimary}>Save</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={styles.body}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
          <ScrollView
            style={styles.scrollFlex}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingBottom: insets.bottom + 24 + keyboardOffset,
              paddingHorizontal: 20,
              paddingTop: 16,
            }}>
          {mode === 'add' ? (
            <View style={styles.templateSection}>
              <Text style={styles.templateSectionLabel}>Saved meal</Text>
              <Pressable
                style={styles.templatePickerBtn}
                onPress={() => setTemplateMenuOpen((open) => !open)}>
                <Text style={styles.templatePickerValue}>
                  {mealTemplates.length === 0
                    ? 'No saved meals yet — fill in below'
                    : 'Choose a saved meal to fill in fields'}
                </Text>
                {mealTemplates.length > 0 ? (
                  <MaterialIcons
                    name={templateMenuOpen ? 'expand-less' : 'expand-more'}
                    size={22}
                    color={theme.colors.gold}
                  />
                ) : null}
              </Pressable>
              {templateMenuOpen && mealTemplates.length > 0 ? (
                <View style={styles.templateMenu}>
                  {mealTemplates.map((t) => (
                    <Pressable
                      key={t.id}
                      style={styles.templateRow}
                      onPress={() => applyTemplate(t)}>
                      <View style={styles.templateRowCopy}>
                        <Text style={styles.templateRowSlot}>{t.slot}</Text>
                        <Text style={styles.templateRowName}>{t.name}</Text>
                        <Text style={styles.templateRowMeta}>
                          {t.macros.kcal} kcal · {t.macros.proteinG}g protein
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          <SectionCard title="When">
            <View style={styles.slotGrid}>
              {SLOTS.map((s) => {
                const active = slot === s;
                return (
                  <Pressable
                    key={s}
                    style={[styles.slotOption, active && styles.slotOptionActive]}
                    onPress={() => setSlot(s)}>
                    <Text
                      style={[
                        styles.slotOptionTxt,
                        active && styles.slotOptionTxtActive,
                      ]}>
                      {SLOT_LABELS[s]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </SectionCard>

          <SectionCard title="Details">
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.fieldInput}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Chicken & rice bowl"
                placeholderTextColor={theme.colors.onSurfaceVariant}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputMulti]}
                value={description}
                onChangeText={setDescription}
                placeholder="Ingredients, prep, portions…"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                multiline
              />
            </View>
          </SectionCard>

          <SectionCard title="Macros">
            <View style={styles.kcalHero}>
              <View style={styles.kcalHeroTop}>
                <MaterialIcons name="local-fire-department" size={20} color={theme.colors.gold} />
                <Text style={styles.kcalHeroLabel}>Total calories</Text>
              </View>
              <Pressable
                style={styles.kcalHeroRow}
                onPress={kcalEditing ? undefined : startKcalEditing}
                disabled={kcalEditing}
                accessibilityRole="button"
                accessibilityLabel="Edit total calories"
                accessibilityHint="Opens number keyboard">
                {kcalEditing ? (
                  <TextInput
                    ref={kcalInputRef}
                    style={styles.kcalHeroInput}
                    value={kcalDraft}
                    onChangeText={setKcalDraft}
                    onBlur={commitKcalDraft}
                    onSubmitEditing={commitKcalDraft}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    autoFocus
                    selectTextOnFocus
                    returnKeyType="done"
                    maxLength={4}
                    placeholder="0"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                  />
                ) : (
                  <Text style={styles.kcalHeroValue}>{displayKcal}</Text>
                )}
                <Text style={styles.kcalHeroUnit}>kcal</Text>
              </Pressable>
              {!kcalEditing ? (
                <Text style={styles.kcalHeroHint}>Tap the number to type calories</Text>
              ) : null}
              <Text style={styles.kcalHeroMeta}>
                {proteinG}g protein · {carbsG}g carbs · {fatG}g fat
              </Text>
              {kcalManual ? (
                <Pressable
                  style={styles.syncChip}
                  onPress={() => {
                    setKcal(suggestedKcal);
                    setKcalManual(false);
                  }}>
                  <MaterialIcons name="sync" size={14} color={theme.colors.gold} />
                  <Text style={styles.syncChipTxt}>
                    Recalculate from macros (~{suggestedKcal})
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.macroStepperRow}>
              <NumberStepper
                label="Protein"
                suffix="g"
                value={proteinG}
                onChange={updateProtein}
                min={0}
                max={300}
                step={1}
                allowKeyboardInput
                keyboardType="number-pad"
                compact
              />
              <NumberStepper
                label="Carbs"
                suffix="g"
                value={carbsG}
                onChange={updateCarbs}
                min={0}
                max={500}
                step={1}
                allowKeyboardInput
                keyboardType="number-pad"
                compact
              />
            </View>
            <View style={styles.macroStepperRow}>
              <NumberStepper
                label="Fat"
                suffix="g"
                value={fatG}
                onChange={updateFat}
                min={0}
                max={200}
                step={1}
                allowKeyboardInput
                keyboardType="number-pad"
                compact
              />
              <NumberStepper
                label="Calories"
                suffix="kcal"
                value={displayKcal}
                onChange={(n) => {
                  setKcalManual(true);
                  setKcal(n);
                }}
                min={0}
                max={5000}
                step={25}
                allowKeyboardInput
                keyboardType="number-pad"
                compact
              />
            </View>
          </SectionCard>

          {onDelete ? (
            <Pressable style={styles.deleteBtn} onPress={onDelete}>
              <MaterialIcons name="delete-outline" size={18} color={theme.colors.error} />
              <Text style={styles.deleteTxt}>Remove from daily log</Text>
            </Pressable>
          ) : null}

          {mode === 'add' ? (
            <Text style={styles.hint}>
              Save adds this meal to your daily log and keeps it in the dropdown for next time.
            </Text>
          ) : null}
          {error ? <Text style={styles.err}>{error}</Text> : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: theme.colors.background },
  body: { flex: 1 },
  scrollFlex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
    backgroundColor: theme.colors.background,
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
  templateSection: {
    marginBottom: 20,
    gap: 8,
  },
  templateSectionLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  templatePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerHigh,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  templatePickerValue: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onBackground,
    lineHeight: 19,
  },
  templateMenu: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainer,
    overflow: 'hidden',
  },
  templateRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineStrong,
  },
  templateRowCopy: { gap: 3 },
  templateRowSlot: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 1.2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  templateRowName: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 14,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  templateRowMeta: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerHigh,
    padding: 16,
    gap: 14,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotOption: {
    width: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainer,
    paddingVertical: 12,
    alignItems: 'center',
  },
  slotOptionActive: {
    backgroundColor: theme.colors.gold,
    borderColor: theme.colors.gold,
  },
  slotOptionTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 0.5,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  slotOptionTxtActive: { color: theme.colors.onGold },
  field: { gap: 6 },
  fieldLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainer,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.colors.onBackground,
  },
  fieldInputMulti: { minHeight: 88, textAlignVertical: 'top' },
  kcalHero: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainer,
    padding: 14,
    gap: 6,
  },
  kcalHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kcalHeroLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 1,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  kcalHeroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    minHeight: 48,
    alignSelf: 'flex-start',
  },
  kcalHeroValue: {
    fontFamily: theme.fonts.headline,
    fontSize: 36,
    color: theme.colors.gold,
    lineHeight: 38,
  },
  kcalHeroInput: {
    fontFamily: theme.fonts.headline,
    fontSize: 36,
    color: theme.colors.gold,
    lineHeight: 38,
    minWidth: 72,
    padding: 0,
  },
  kcalHeroUnit: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingBottom: 4,
  },
  kcalHeroMeta: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onBackground,
  },
  kcalHeroHint: {
    fontFamily: theme.fonts.body,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
  },
  syncChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerHigh,
  },
  syncChipTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    color: theme.colors.gold,
    letterSpacing: 0.5,
  },
  macroStepperRow: { flexDirection: 'row', gap: 10 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginBottom: 8,
  },
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
