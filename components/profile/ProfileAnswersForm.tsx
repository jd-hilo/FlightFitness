import { persistProfileFirstName } from '@/lib/api/profileFirstName';
import { type ReactNode, useEffect, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ScrollNumberPicker } from '@/components/onboarding/ScrollNumberPicker';
import { WeightPicker } from '@/components/onboarding/WeightPicker';
import { theme } from '@/constants/theme';
import {
  ALLERGY_NONE_ID,
  ALLERGY_OPTIONS,
  COOKING_SKILL_OPTIONS,
  DIET_MODIFIER_OPTIONS,
  DIET_PATTERN_OPTIONS,
  EQUIPMENT_OPTIONS,
  EXPERIENCE_OPTIONS,
  FOOD_PREFERENCE_OPTIONS,
  MAX_FOOD_PREFERENCE_SELECTIONS,
  GOAL_OPTIONS,
  INJURY_LIMITATION_OPTIONS,
  INJURY_NONE_ID,
  MAX_ALLERGY_SELECTIONS,
  MAX_INJURY_SELECTIONS,
  MEALS_PER_DAY_OPTIONS,
  NUTRITION_PACE_OPTIONS,
  SESSION_LENGTH_OPTIONS,
  SEX_OPTIONS,
  TRAINING_DAYS_OPTIONS,
  TRAINING_TIME_OPTIONS,
  ageValues,
  formatHeightInchesLabel,
  heightInchesValues,
  isDietModifierOptionDisabled,
  isEquipmentOptionDisabled,
} from '@/lib/onboardingOptions';
import { useOnboardingStore } from '@/stores/onboardingStore';

const MAX_MODIFIERS = 5;
const AGE_VALUES = ageValues();
const HEIGHT_VALUES = heightInchesValues();

export function ProfileAnswersForm() {
  const scrollRef = useRef<ScrollView | null>(null);
  const firstNameSyncSkip = useRef(true);
  const answers = useOnboardingStore((s) => s.answers);
  const toggleGoal = useOnboardingStore((s) => s.toggleGoal);
  const setSingle = useOnboardingStore((s) => s.setSingle);
  const toggleEquipment = useOnboardingStore((s) => s.toggleEquipment);
  const toggleDietModifier = useOnboardingStore((s) => s.toggleDietModifier);
  const toggleFoodPreference = useOnboardingStore((s) => s.toggleFoodPreference);
  const toggleTrainingTime = useOnboardingStore((s) => s.toggleTrainingTime);
  const toggleInjuryLimitation = useOnboardingStore((s) => s.toggleInjuryLimitation);
  const toggleAllergy = useOnboardingStore((s) => s.toggleAllergy);
  const setNotes = useOnboardingStore((s) => s.setNotes);
  const setAnswers = useOnboardingStore((s) => s.setAnswers);
  const setWeight = useOnboardingStore((s) => s.setWeight);

  const injuryRealCount = answers.injuryLimitationIds.filter(
    (id) => id !== INJURY_NONE_ID
  ).length;
  const allergyRealCount = answers.allergyIds.filter(
    (id) => id !== ALLERGY_NONE_ID
  ).length;

  const scrollNotesIntoView = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

  useEffect(() => {
    if (firstNameSyncSkip.current) {
      firstNameSyncSkip.current = false;
      return;
    }
    const trimmed = answers.firstName.trim();
    const t = setTimeout(() => {
      void persistProfileFirstName(trimmed).then((res) => {
        if (__DEV__ && !res.ok) console.warn('[persistProfileFirstName]', res.error);
      });
    }, 700);
    return () => clearTimeout(t);
  }, [answers.firstName]);

  return (
    <KeyboardAvoidingView
      style={styles.kavRoot}
      behavior={Platform.OS === 'ios' ? 'height' : undefined}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>
      <Text style={styles.lead}>
        Changes save automatically. New AI plans will reflect these updates the next
        time your week is generated.
      </Text>

      <Section title="Your name">
        <Text style={styles.subLabel}>First name (shown on Home)</Text>
        <TextInput
          style={styles.textField}
          placeholder="Alex"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          autoCapitalize="words"
          autoCorrect={false}
          autoComplete="name-given"
          textContentType="givenName"
          returnKeyType="done"
          blurOnSubmit
          value={answers.firstName}
          onChangeText={(t) => {
            const s = t.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ' \-]/g, '');
            setAnswers({ firstName: s.replace(/\s{2,}/g, ' ').slice(0, 40) });
          }}
          maxLength={40}
          accessibilityLabel="First name"
        />
      </Section>

      <Section title="Main goal">
        <Text style={styles.subLabel}>Select up to 2</Text>
        <ChipGrid>
          {GOAL_OPTIONS.map((opt) => {
            const selected = answers.goal.includes(opt.id);
            const atCap = answers.goal.length >= 2 && !selected;
            return (
              <Chip
                key={opt.id}
                label={opt.label}
                selected={selected}
                disabled={atCap}
                onPress={() => toggleGoal(opt.id)}
              />
            );
          })}
        </ChipGrid>
      </Section>

      <Section title="About you">
        <Text style={styles.subLabel}>Sex</Text>
        <ChipGrid>
          {SEX_OPTIONS.map((opt) => {
            const selected = answers.sex === opt.id;
            return (
              <Chip
                key={opt.id}
                label={opt.label}
                selected={selected}
                onPress={() => setSingle('sex', opt.id)}
              />
            );
          })}
        </ChipGrid>
        <ScrollNumberPicker
          label="Age"
          hint="Years — for calorie estimates."
          values={AGE_VALUES}
          value={answers.ageYears}
          onChange={(y) => setAnswers({ ageYears: y })}
          formatItem={(y) => `${y} yrs`}
        />
        <ScrollNumberPicker
          label="Height"
          hint="Total inches (scroll shows feet & inches)."
          values={HEIGHT_VALUES}
          value={answers.heightInches}
          onChange={(h) => setAnswers({ heightInches: h })}
          formatItem={formatHeightInchesLabel}
        />
      </Section>

      <Section title="Training experience">
        <ChipGrid>
          {EXPERIENCE_OPTIONS.map((opt) => {
            const selected = answers.experience === opt.id;
            return (
              <Chip
                key={opt.id}
                label={opt.label}
                selected={selected}
                onPress={() => setSingle('experience', opt.id)}
              />
            );
          })}
        </ChipGrid>
      </Section>

      <Section title="Equipment" subtitle="Select everything you use.">
        <ChipGrid>
          {EQUIPMENT_OPTIONS.map((opt) => {
            const selected = answers.equipment.includes(opt.id);
            const disabled = isEquipmentOptionDisabled(answers.equipment, opt.id);
            return (
              <Chip
                key={opt.id}
                label={opt.label}
                selected={selected}
                disabled={disabled}
                onPress={() => toggleEquipment(opt.id)}
              />
            );
          })}
        </ChipGrid>
      </Section>

      <Section title="Sessions & your body">
        <Text style={styles.subLabel}>Typical strength session</Text>
        <ChipGrid>
          {SESSION_LENGTH_OPTIONS.map((opt) => {
            const selected = answers.sessionLengthId === opt.id;
            return (
              <Chip
                key={opt.id}
                label={opt.label}
                selected={selected}
                onPress={() => setSingle('sessionLengthId', opt.id)}
              />
            );
          })}
        </ChipGrid>
        <Text style={[styles.subLabel, { marginTop: 16 }]}>Limitations</Text>
        <Text style={styles.capHint}>
          {injuryRealCount} / {MAX_INJURY_SELECTIONS} selected
        </Text>
        <ChipGrid>
          {INJURY_LIMITATION_OPTIONS.map((opt) => {
            const selected = answers.injuryLimitationIds.includes(opt.id);
            const isNone = opt.id === INJURY_NONE_ID;
            const atRealCap =
              injuryRealCount >= MAX_INJURY_SELECTIONS && !selected && !isNone;
            return (
              <Chip
                key={opt.id}
                label={opt.label}
                selected={selected}
                disabled={atRealCap}
                onPress={() => toggleInjuryLimitation(opt.id)}
              />
            );
          })}
        </ChipGrid>
        <Text style={[styles.subLabel, { marginTop: 16 }]}>Notes</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Pain, doctor limits, movements to avoid…"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          multiline
          returnKeyType="done"
          blurOnSubmit
          value={answers.injuryNotes}
          onChangeText={(t) => setNotes('injuryNotes', t)}
          onFocus={scrollNotesIntoView}
          maxLength={500}
        />
      </Section>

      <Section title="How do you usually eat?">
        <ChipGrid>
          {DIET_PATTERN_OPTIONS.map((opt) => {
            const selected = answers.dietPattern === opt.id;
            return (
              <Chip
                key={opt.id}
                label={opt.label}
                selected={selected}
                onPress={() => setSingle('dietPattern', opt.id)}
              />
            );
          })}
        </ChipGrid>
      </Section>

      <Section
        title="Diet rules & macro style"
        subtitle={`Up to ${MAX_MODIFIERS} — optional.`}>
        <Text style={styles.capHint}>{answers.dietModifiers.length} / {MAX_MODIFIERS}</Text>
        <ChipGrid>
          {DIET_MODIFIER_OPTIONS.map((opt) => {
            const selected = answers.dietModifiers.includes(opt.id);
            const ruleDisabled = isDietModifierOptionDisabled(
              answers.dietModifiers,
              opt.id
            );
            const atCap =
              answers.dietModifiers.length >= MAX_MODIFIERS && !selected;
            const disabled = atCap || ruleDisabled;
            return (
              <Chip
                key={opt.id}
                label={opt.label}
                selected={selected}
                disabled={disabled}
                onPress={() => toggleDietModifier(opt.id)}
              />
            );
          })}
        </ChipGrid>
      </Section>

      <Section
        title="Tastes & meal style"
        subtitle={`Pick what fits you — up to ${MAX_FOOD_PREFERENCE_SELECTIONS}. Add dislikes or cuisines in “Anything else about food?” below.`}>
        <Text style={styles.capHint}>
          {answers.foodPreferences.length} / {MAX_FOOD_PREFERENCE_SELECTIONS}
        </Text>
        <ChipGrid>
          {FOOD_PREFERENCE_OPTIONS.map((opt) => {
            const selected = answers.foodPreferences.includes(opt.id);
            const atCap =
              answers.foodPreferences.length >= MAX_FOOD_PREFERENCE_SELECTIONS &&
              !selected;
            return (
              <Chip
                key={opt.id}
                label={opt.label}
                selected={selected}
                disabled={atCap}
                onPress={() => toggleFoodPreference(opt.id)}
              />
            );
          })}
        </ChipGrid>
      </Section>

      <Section title="Anything else about food?">
        <TextInput
          style={styles.textArea}
          placeholder="Cultural foods, fasting, details for “other / flexible”…"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          multiline
          returnKeyType="done"
          blurOnSubmit
          value={answers.dietOtherNotes}
          onChangeText={(t) => setNotes('dietOtherNotes', t)}
          onFocus={scrollNotesIntoView}
          maxLength={600}
        />
      </Section>

      <Section title="Food allergies">
        <Text style={styles.capHint}>
          {allergyRealCount} / {MAX_ALLERGY_SELECTIONS} allergens
        </Text>
        <ChipGrid>
          {ALLERGY_OPTIONS.map((opt) => {
            const selected = answers.allergyIds.includes(opt.id);
            const isNone = opt.id === ALLERGY_NONE_ID;
            const atCap =
              allergyRealCount >= MAX_ALLERGY_SELECTIONS && !selected && !isNone;
            return (
              <Chip
                key={opt.id}
                label={opt.label}
                selected={selected}
                disabled={atCap}
                onPress={() => toggleAllergy(opt.id)}
              />
            );
          })}
        </ChipGrid>
        <Text style={[styles.subLabel, { marginTop: 16 }]}>Other allergies</Text>
        <TextInput
          style={styles.textArea}
          placeholder="e.g. Mango, mustard…"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          multiline
          returnKeyType="done"
          blurOnSubmit
          value={answers.allergyOtherNotes}
          onChangeText={(t) => setNotes('allergyOtherNotes', t)}
          onFocus={scrollNotesIntoView}
          maxLength={300}
        />
      </Section>

      <Section title="Training days per week">
        <ChipGrid>
          {TRAINING_DAYS_OPTIONS.map((opt) => {
            const selected = answers.trainingDaysPerWeek === opt.id;
            return (
              <Chip
                key={opt.id}
                label={opt.label}
                selected={selected}
                onPress={() => setSingle('trainingDaysPerWeek', opt.id)}
              />
            );
          })}
        </ChipGrid>
      </Section>

      <Section
        title="When do you usually work out?"
        subtitle="Flexible OR up to two time windows. Weekends can stack on top.">
        <ChipGrid>
          {TRAINING_TIME_OPTIONS.map((opt) => {
            const selected = answers.trainingTimePrefs.includes(opt.id);
            return (
              <Chip
                key={opt.id}
                label={opt.label}
                selected={selected}
                onPress={() => toggleTrainingTime(opt.id)}
              />
            );
          })}
        </ChipGrid>
      </Section>

      <Section title="Pace & kitchen">
        <Text style={styles.subLabel}>Weight-change pace</Text>
        <ChipGrid>
          {NUTRITION_PACE_OPTIONS.map((opt) => {
            const selected = answers.nutritionPaceId === opt.id;
            return (
              <Chip
                key={opt.id}
                label={opt.label}
                selected={selected}
                onPress={() => setSingle('nutritionPaceId', opt.id)}
              />
            );
          })}
        </ChipGrid>
        <Text style={[styles.subLabel, { marginTop: 16 }]}>Meals per day</Text>
        <ChipGrid>
          {MEALS_PER_DAY_OPTIONS.map((opt) => {
            const selected = answers.mealsPerDayId === opt.id;
            return (
              <Chip
                key={opt.id}
                label={opt.label}
                selected={selected}
                onPress={() => setSingle('mealsPerDayId', opt.id)}
              />
            );
          })}
        </ChipGrid>
        <Text style={[styles.subLabel, { marginTop: 16 }]}>Cooking level</Text>
        <ChipGrid>
          {COOKING_SKILL_OPTIONS.map((opt) => {
            const selected = answers.cookingSkillId === opt.id;
            return (
              <Chip
                key={opt.id}
                label={opt.label}
                selected={selected}
                onPress={() => setSingle('cookingSkillId', opt.id)}
              />
            );
          })}
        </ChipGrid>
      </Section>

      <Section title="Current weight">
        <WeightPicker
          label="Pounds (lb)"
          hint="Used with height and age for calorie context."
          value={answers.currentWeightLb}
          onChange={(lb) => setWeight('currentWeightLb', lb)}
        />
      </Section>

      <Section title="Target weight">
        <WeightPicker
          label="Pounds (lb)"
          hint="Where you want to land."
          value={answers.targetWeightLb}
          onChange={(lb) => setWeight('targetWeightLb', lb)}
        />
      </Section>

      <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function ChipGrid({ children }: { children: ReactNode }) {
  return <View style={styles.chipGrid}>{children}</View>;
}

function Chip({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.chip,
        selected && styles.chipSelected,
        disabled && styles.chipDisabled,
      ]}>
      <Text
        style={[
          styles.chipText,
          selected && styles.chipTextSelected,
          disabled && styles.chipTextDisabled,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kavRoot: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  lead: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 19,
    marginBottom: 20,
  },
  section: {
    marginBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: 12,
  },
  subLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  capHint: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1,
    color: theme.colors.gold,
    marginBottom: 10,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerLow,
    maxWidth: '100%',
  },
  chipSelected: {
    borderColor: theme.colors.gold,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
  },
  chipDisabled: { opacity: 0.35 },
  chipText: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onBackground,
  },
  chipTextSelected: {
    fontFamily: theme.fonts.label,
    color: theme.colors.gold,
  },
  chipTextDisabled: { color: theme.colors.onSurfaceVariant },
  textArea: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 12,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.onBackground,
    textAlignVertical: 'top',
  },
  textField: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    color: theme.colors.onBackground,
  },
});
