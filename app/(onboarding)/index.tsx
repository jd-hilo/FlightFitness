import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WeightPicker } from '@/components/onboarding/WeightPicker';
import { theme } from '@/constants/theme';
import {
  DIET_MODIFIER_OPTIONS,
  DIET_PATTERN_OPTIONS,
  EQUIPMENT_OPTIONS,
  EXPERIENCE_OPTIONS,
  FOOD_PREFERENCE_OPTIONS,
  GOAL_OPTIONS,
  TRAINING_DAYS_OPTIONS,
  TRAINING_TIME_OPTIONS,
} from '@/lib/onboardingOptions';
import { isStepComplete, useOnboardingStore } from '@/stores/onboardingStore';

type SingleField =
  | 'goal'
  | 'experience'
  | 'dietPattern'
  | 'trainingDaysPerWeek';

type SingleStep = {
  kind: 'single';
  stepId: string;
  field: SingleField;
  title: string;
  subtitle: string;
  options: readonly { id: string; label: string }[];
};

type MultiStep = {
  kind: 'multi';
  stepId: string;
  title: string;
  subtitle: string;
  options: readonly { id: string; label: string }[];
};

type CappedStep = {
  kind: 'capped';
  stepId: string;
  variant: 'dietModifiers' | 'foodPreferences';
  title: string;
  subtitle: string;
  max: number;
  options: readonly { id: string; label: string }[];
};

type TimesStep = {
  kind: 'times';
  stepId: string;
  title: string;
  subtitle: string;
  options: readonly { id: string; label: string }[];
};

type WeightStep = {
  kind: 'weight';
  stepId: string;
  field: 'currentWeightLb' | 'targetWeightLb';
  title: string;
  hint: string;
};

type Step = SingleStep | MultiStep | CappedStep | TimesStep | WeightStep;

const STEPS: Step[] = [
  {
    kind: 'single',
    stepId: 'goal',
    field: 'goal',
    title: 'Main goal',
    subtitle:
      'Pick one primary focus. We’ll match calories, training style, and recovery to it—recomposition is slower than a pure cut or bulk.',
    options: GOAL_OPTIONS,
  },
  {
    kind: 'single',
    stepId: 'experience',
    field: 'experience',
    title: 'Training experience',
    subtitle:
      'One honest answer helps us scale volume and complexity. Returning athletes: choose “returning” or your true training age.',
    options: EXPERIENCE_OPTIONS,
  },
  {
    kind: 'multi',
    stepId: 'equipment',
    title: 'What equipment do you have?',
    subtitle:
      'Select everything you actually use. We only suggest movements you can do.',
    options: EQUIPMENT_OPTIONS,
  },
  {
    kind: 'single',
    stepId: 'dietPattern',
    field: 'dietPattern',
    title: 'How do you usually eat?',
    subtitle:
      'One base pattern sets protein sources and meal templates. You’ll add restrictions and likes on the next screens.',
    options: DIET_PATTERN_OPTIONS,
  },
  {
    kind: 'capped',
    stepId: 'dietModifiers',
    variant: 'dietModifiers',
    title: 'Food rules & macros',
    subtitle:
      'Optional — up to 5. Halal/Kosher stack on your base pattern from the last step.',
    max: 5,
    options: DIET_MODIFIER_OPTIONS,
  },
  {
    kind: 'capped',
    stepId: 'foodPreferences',
    variant: 'foodPreferences',
    title: 'Tastes & meal style',
    subtitle:
      'Optional — up to 5. Dislikes and cuisines help us vary meals without guessing.',
    max: 5,
    options: FOOD_PREFERENCE_OPTIONS,
  },
  {
    kind: 'single',
    stepId: 'trainingDays',
    field: 'trainingDaysPerWeek',
    title: 'How many days can you train?',
    subtitle:
      'We’ll match workout volume to this—fewer days usually means fuller sessions.',
    options: TRAINING_DAYS_OPTIONS,
  },
  {
    kind: 'times',
    stepId: 'trainingTimes',
    title: 'When do you usually work out?',
    subtitle:
      'Pick “Flexible” OR up to two time windows. “Stack weekends” can add on top.',
    options: TRAINING_TIME_OPTIONS,
  },
  {
    kind: 'weight',
    stepId: 'weightCurrent',
    field: 'currentWeightLb',
    title: 'Current weight',
    hint: 'Used for calorie and protein context.',
  },
  {
    kind: 'weight',
    stepId: 'weightTarget',
    field: 'targetWeightLb',
    title: 'Target weight',
    hint: 'Where you want to land—we’ll align nutrition with your main goal.',
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const answers = useOnboardingStore((s) => s.answers);
  const setSingle = useOnboardingStore((s) => s.setSingle);
  const toggleEquipment = useOnboardingStore((s) => s.toggleEquipment);
  const toggleDietModifier = useOnboardingStore((s) => s.toggleDietModifier);
  const toggleFoodPreference = useOnboardingStore((s) => s.toggleFoodPreference);
  const toggleTrainingTime = useOnboardingStore((s) => s.toggleTrainingTime);
  const setWeight = useOnboardingStore((s) => s.setWeight);
  const complete = useOnboardingStore((s) => s.complete);
  const [step, setStep] = useState(0);

  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  const canNext = isStepComplete(answers, current.stepId);

  const next = () => {
    if (isLast) {
      complete();
      router.replace('/(onboarding)/generate');
    } else {
      setStep((s) => s + 1);
    }
  };

  const back = () => {
    if (step === 0) return;
    setStep((s) => s - 1);
  };

  const cappedCount =
    current.kind === 'capped'
      ? current.variant === 'dietModifiers'
        ? answers.dietModifiers.length
        : answers.foodPreferences.length
      : 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.brand}>FLIGHT FITNESS</Text>
      <Text style={styles.stepLabel}>
        Step {step + 1} / {STEPS.length}
      </Text>

      {current.kind === 'single' ? (
        <>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.subtitle}>{current.subtitle}</Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}>
            <View style={styles.chipGrid}>
              {current.options.map((opt) => {
                const selected = answers[current.field] === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setSingle(current.field, opt.id)}
                    style={[styles.chip, selected && styles.chipSelected]}>
                    <Text
                      style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </>
      ) : null}

      {current.kind === 'multi' ? (
        <>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.subtitle}>{current.subtitle}</Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}>
            <View style={styles.chipGrid}>
              {current.options.map((opt) => {
                const selected = answers.equipment.includes(opt.id);
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => toggleEquipment(opt.id)}
                    style={[styles.chip, selected && styles.chipSelected]}>
                    <Text
                      style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </>
      ) : null}

      {current.kind === 'capped' ? (
        <>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.subtitle}>{current.subtitle}</Text>
          <Text style={styles.capHint}>
            Selected {cappedCount} / {current.max}
            {cappedCount >= current.max ? ' — remove one to add another' : ''}
          </Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}>
            <View style={styles.chipGrid}>
              {current.options.map((opt) => {
                const list =
                  current.variant === 'dietModifiers'
                    ? answers.dietModifiers
                    : answers.foodPreferences;
                const selected = list.includes(opt.id);
                const atCap = list.length >= current.max && !selected;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() =>
                      current.variant === 'dietModifiers'
                        ? toggleDietModifier(opt.id)
                        : toggleFoodPreference(opt.id)
                    }
                    disabled={atCap}
                    style={[
                      styles.chip,
                      selected && styles.chipSelected,
                      atCap && styles.chipDisabled,
                    ]}>
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                        atCap && styles.chipTextDisabled,
                      ]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </>
      ) : null}

      {current.kind === 'times' ? (
        <>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.subtitle}>{current.subtitle}</Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}>
            <View style={styles.chipGrid}>
              {current.options.map((opt) => {
                const selected = answers.trainingTimePrefs.includes(opt.id);
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => toggleTrainingTime(opt.id)}
                    style={[styles.chip, selected && styles.chipSelected]}>
                    <Text
                      style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </>
      ) : null}

      {current.kind === 'weight' ? (
        <>
          <Text style={styles.title}>{current.title}</Text>
          <View style={styles.weightScroll}>
            <WeightPicker
              label="Pounds (lb)"
              hint={current.hint}
              value={answers[current.field]}
              onChange={(lb) => setWeight(current.field, lb)}
            />
          </View>
        </>
      ) : null}

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable onPress={back} style={styles.secondary} disabled={step === 0}>
          <Text style={[styles.secondaryTxt, step === 0 && styles.disabled]}>
            Back
          </Text>
        </Pressable>
        <Pressable
          onPress={next}
          style={[styles.primary, !canNext && styles.primaryDisabled]}
          disabled={!canNext}>
          <Text style={styles.primaryTxt}>{isLast ? 'Build my plan' : 'Next'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 24,
  },
  brand: {
    fontFamily: theme.fonts.headline,
    fontSize: 28,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  stepLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 22,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 12,
  },
  capHint: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1,
    color: theme.colors.gold,
    marginBottom: 12,
  },
  chipsScroll: { flexGrow: 1, paddingBottom: 16 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerLow,
    maxWidth: '100%',
  },
  chipSelected: {
    borderColor: theme.colors.gold,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
  },
  chipDisabled: {
    opacity: 0.35,
  },
  chipText: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onBackground,
  },
  chipTextSelected: {
    fontFamily: theme.fonts.label,
    color: theme.colors.gold,
  },
  chipTextDisabled: {
    color: theme.colors.onSurfaceVariant,
  },
  weightScroll: { flexGrow: 1 },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  secondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  disabled: { opacity: 0.3 },
  primary: {
    flex: 2,
    backgroundColor: theme.colors.gold,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryDisabled: { opacity: 0.4 },
  primaryTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.onGold,
    textTransform: 'uppercase',
  },
});
