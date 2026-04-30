import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import {
  persistProfileFirstName,
  pullProfileFirstNameIntoStore,
} from '@/lib/api/profileFirstName';
import { useKeyboardOffset } from '@/lib/useKeyboardOffset';
import { isStepComplete, useOnboardingStore } from '@/stores/onboardingStore';

type SingleField =
  | 'experience'
  | 'dietPattern'
  | 'trainingDaysPerWeek'
  | 'sex';

type SingleStep = {
  kind: 'single';
  stepId: string;
  field: SingleField;
  title: string;
  subtitle: string;
  options: readonly { id: string; label: string }[];
};

type GoalStep = {
  kind: 'goal';
  stepId: 'goal';
  title: string;
  subtitle: string;
  max: number;
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

type NumberPickerStep = {
  kind: 'numberPicker';
  stepId: 'aboutAge' | 'aboutHeight';
  variant: 'age' | 'height';
  title: string;
  subtitle: string;
};

type SessionInjuryStep = {
  kind: 'sessionInjury';
  stepId: 'sessionInjury';
  title: string;
  subtitle: string;
};

type TextNotesStep = {
  kind: 'textNotes';
  stepId: 'dietOtherNotes';
  title: string;
  subtitle: string;
  placeholder: string;
};

type AllergiesStep = {
  kind: 'allergies';
  stepId: 'allergies';
  title: string;
  subtitle: string;
};

type PaceKitchenStep = {
  kind: 'paceKitchen';
  stepId: 'paceKitchen';
  title: string;
  subtitle: string;
};

type FirstNameStep = {
  kind: 'firstName';
  stepId: 'firstName';
  title: string;
  subtitle: string;
  placeholder: string;
};

type Step =
  | FirstNameStep
  | GoalStep
  | SingleStep
  | MultiStep
  | CappedStep
  | TimesStep
  | WeightStep
  | NumberPickerStep
  | SessionInjuryStep
  | TextNotesStep
  | AllergiesStep
  | PaceKitchenStep;

const FIRST_NAME_MAX = 40;

function normalizeFirstNameInput(raw: string): string {
  let s = raw.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ' \-]/g, '');
  s = s.replace(/\s{2,}/g, ' ');
  return s.slice(0, FIRST_NAME_MAX);
}

const STEPS: Step[] = [
  {
    kind: 'firstName',
    stepId: 'firstName',
    title: 'What should we call you?',
    subtitle:
      'Your first name appears on Home—just for you. It is not shown on a public profile.',
    placeholder: 'Alex',
  },
  {
    kind: 'goal',
    stepId: 'goal',
    title: 'Main goal',
    subtitle:
      'Pick up to 2 priorities. We’ll match calories, training style, and recovery to them—recomposition is slower than a pure cut or bulk.',
    max: 2,
  },
  {
    kind: 'single',
    stepId: 'aboutSex',
    field: 'sex',
    title: 'About you',
    subtitle:
      'Used for calorie estimates only — not shared. Pick what fits; all options are respected.',
    options: SEX_OPTIONS,
  },
  {
    kind: 'numberPicker',
    stepId: 'aboutAge',
    variant: 'age',
    title: 'Your age',
    subtitle:
      'We use this with height and weight for responsible calorie targets.',
  },
  {
    kind: 'numberPicker',
    stepId: 'aboutHeight',
    variant: 'height',
    title: 'Your height',
    subtitle:
      'Scroll to your height. Shown as feet & inches and total inches.',
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
    kind: 'sessionInjury',
    stepId: 'sessionInjury',
    title: 'Sessions & your body',
    subtitle:
      'Typical strength-training length and anything we should work around (joints, back, clearance). Optional notes help a lot.',
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
    title: 'Diet rules & macro style',
    subtitle:
      'Optional — up to 5. Pick religious or medical food rules, plus how you prefer carbs and protein handled.',
    max: 5,
    options: DIET_MODIFIER_OPTIONS,
  },
  {
    kind: 'capped',
    stepId: 'foodPreferences',
    variant: 'foodPreferences',
    title: 'Tastes & meal style',
    subtitle:
      'Optional — pick how you like to eat and cook. Use the next screen for dislikes, cuisines, or cultural details.',
    max: MAX_FOOD_PREFERENCE_SELECTIONS,
    options: FOOD_PREFERENCE_OPTIONS,
  },
  {
    kind: 'textNotes',
    stepId: 'dietOtherNotes',
    title: 'Anything else about food?',
    subtitle:
      'Optional. Cultural foods, fasting windows, or details for “other / flexible” — short phrases are perfect.',
    placeholder: 'e.g. No pork, eat halal only at home, 16:8 most days…',
  },
  {
    kind: 'allergies',
    stepId: 'allergies',
    title: 'Food allergies',
    subtitle:
      'Medical allergies only (not the same as “don’t like”). Add other allergens in the box below.',
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
    kind: 'paceKitchen',
    stepId: 'paceKitchen',
    title: 'Pace & kitchen',
    subtitle:
      'How fast you want the scale to move (if at all), how you eat through the day, and how complex recipes should be.',
  },
  {
    kind: 'weight',
    stepId: 'weightCurrent',
    field: 'currentWeightLb',
    title: 'Current weight',
    hint: 'Used with height and age for calorie context.',
  },
  {
    kind: 'weight',
    stepId: 'weightTarget',
    field: 'targetWeightLb',
    title: 'Target weight',
    hint: 'Where you want to land—we’ll align nutrition with your main goal.',
  },
];

const AGE_VALUES = ageValues();
const HEIGHT_VALUES = heightInchesValues();

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const keyboardOffset = useKeyboardOffset();
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
  const complete = useOnboardingStore((s) => s.complete);
  const [step, setStep] = useState(0);
  const notesScrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    void pullProfileFirstNameIntoStore();
  }, []);

  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  const canNext = isStepComplete(answers, current.stepId);

  const next = () => {
    if (!canNext) return;
    const leavingFirstName = current.stepId === 'firstName';
    const first = answers.firstName.trim();
    void (async () => {
      if (leavingFirstName && first) {
        const res = await persistProfileFirstName(first);
        if (__DEV__ && !res.ok) {
          console.warn('[persistProfileFirstName]', res.error);
        }
      }
      if (isLast) {
        complete();
        router.replace('/(onboarding)/upgrade-offer');
      } else {
        setStep((s) => s + 1);
      }
    })();
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
  const goalCount = answers.goal.length;

  const injuryRealCount = answers.injuryLimitationIds.filter(
    (id) => id !== INJURY_NONE_ID
  ).length;
  const allergyRealCount = answers.allergyIds.filter(
    (id) => id !== ALLERGY_NONE_ID
  ).length;

  const totalSteps = STEPS.length;
  const progressRatio =
    totalSteps > 0 ? Math.min(1, (step + 1) / totalSteps) : 0;
  const shouldHideFooterForKeyboard =
    keyboardOffset > 0 &&
    (current.kind === 'sessionInjury' ||
      current.kind === 'textNotes' ||
      current.kind === 'allergies' ||
      current.kind === 'firstName');

  const scrollNotesToEnd = () => {
    setTimeout(() => {
      notesScrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

  return (
    <KeyboardAvoidingView
      style={styles.kavRoot}
      behavior={Platform.OS === 'ios' ? 'height' : undefined}>
      <View style={[styles.screen, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.brand}>FLIGHT FITNESS</Text>
      <View
        style={styles.progressTrack}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Onboarding progress, step ${step + 1} of ${totalSteps}`}
        accessibilityValue={{ min: 0, max: totalSteps, now: step + 1 }}>
        <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
      </View>

      {current.kind === 'firstName' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={styles.chipsScroll}>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.subtitle}>{current.subtitle}</Text>
          <TextInput
            style={styles.textField}
            placeholder={current.placeholder}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            autoCapitalize="words"
            autoCorrect={false}
            autoComplete="name-given"
            textContentType="givenName"
            returnKeyType="next"
            blurOnSubmit
            value={answers.firstName}
            onChangeText={(t) =>
              setAnswers({ firstName: normalizeFirstNameInput(t) })
            }
            maxLength={FIRST_NAME_MAX}
            accessibilityLabel="First name"
          />
        </ScrollView>
      ) : null}

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

      {current.kind === 'goal' ? (
        <>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.subtitle}>{current.subtitle}</Text>
          <Text style={styles.capHint}>
            Selected {goalCount} / {current.max}
            {goalCount >= current.max ? ' — remove one to add another' : ''}
          </Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}>
            <View style={styles.chipGrid}>
              {GOAL_OPTIONS.map((opt) => {
                const selected = answers.goal.includes(opt.id);
                const atCap = goalCount >= current.max && !selected;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => toggleGoal(opt.id)}
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

      {current.kind === 'numberPicker' ? (
        <>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.subtitle}>{current.subtitle}</Text>
          <View style={styles.weightScroll}>
            {current.variant === 'age' ? (
              <ScrollNumberPicker
                label="Age"
                hint="Years — for responsible calorie estimates."
                values={AGE_VALUES}
                value={answers.ageYears}
                onChange={(y) => setAnswers({ ageYears: y })}
                formatItem={(y) => `${y} yrs`}
              />
            ) : (
              <ScrollNumberPicker
                label="Height"
                hint="Total inches (scroll shows feet & inches)."
                values={HEIGHT_VALUES}
                value={answers.heightInches}
                onChange={(h) => setAnswers({ heightInches: h })}
                formatItem={formatHeightInchesLabel}
              />
            )}
          </View>
        </>
      ) : null}

      {current.kind === 'sessionInjury' ? (
        <ScrollView
          ref={notesScrollRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={styles.chipsScroll}>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.subtitle}>{current.subtitle}</Text>
          <Text style={styles.sectionLabel}>Typical strength session</Text>
          <View style={styles.chipGrid}>
            {SESSION_LENGTH_OPTIONS.map((opt) => {
              const selected = answers.sessionLengthId === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setSingle('sessionLengthId', opt.id)}
                  style={[styles.chip, selected && styles.chipSelected]}>
                  <Text
                    style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
            Limitations (optional)
          </Text>
          <Text style={styles.capHint}>
            Selected {injuryRealCount} / {MAX_INJURY_SELECTIONS} issues
            {injuryRealCount >= MAX_INJURY_SELECTIONS
              ? ' — remove one to add another'
              : ''}
          </Text>
          <View style={styles.chipGrid}>
            {INJURY_LIMITATION_OPTIONS.map((opt) => {
              const selected = answers.injuryLimitationIds.includes(opt.id);
              const isNone = opt.id === INJURY_NONE_ID;
              const atRealCap =
                injuryRealCount >= MAX_INJURY_SELECTIONS &&
                !selected &&
                !isNone;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => toggleInjuryLimitation(opt.id)}
                  disabled={atRealCap}
                  style={[
                    styles.chip,
                    selected && styles.chipSelected,
                    atRealCap && styles.chipDisabled,
                  ]}>
                  <Text
                    style={[
                      styles.chipText,
                      selected && styles.chipTextSelected,
                      atRealCap && styles.chipTextDisabled,
                    ]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
            Notes for your coach / AI
          </Text>
          <TextInput
            style={styles.textArea}
            placeholder="e.g. Doctor said no overhead pressing; mild right knee pain on lunges…"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            multiline
            returnKeyType="done"
            blurOnSubmit
            value={answers.injuryNotes}
            onChangeText={(t) => setNotes('injuryNotes', t)}
            onFocus={scrollNotesToEnd}
            maxLength={500}
          />
        </ScrollView>
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
                const disabled = isEquipmentOptionDisabled(answers.equipment, opt.id);
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => toggleEquipment(opt.id)}
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
                const ruleDisabled =
                  current.variant === 'dietModifiers' &&
                  isDietModifierOptionDisabled(list, opt.id);
                const atCap = list.length >= current.max && !selected;
                const disabled = atCap || ruleDisabled;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() =>
                      current.variant === 'dietModifiers'
                        ? toggleDietModifier(opt.id)
                        : toggleFoodPreference(opt.id)
                    }
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

      {current.kind === 'textNotes' ? (
        <ScrollView
          ref={notesScrollRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={styles.chipsScroll}>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.subtitle}>{current.subtitle}</Text>
          <TextInput
            style={[styles.textArea, { minHeight: 140 }]}
            placeholder={current.placeholder}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            multiline
            returnKeyType="done"
            blurOnSubmit
            value={answers.dietOtherNotes}
            onChangeText={(t) => setNotes('dietOtherNotes', t)}
            onFocus={scrollNotesToEnd}
            maxLength={600}
          />
        </ScrollView>
      ) : null}

      {current.kind === 'allergies' ? (
        <ScrollView
          ref={notesScrollRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={styles.chipsScroll}>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.subtitle}>{current.subtitle}</Text>
          <Text style={styles.capHint}>
            Selected {allergyRealCount} / {MAX_ALLERGY_SELECTIONS} allergens
            {allergyRealCount >= MAX_ALLERGY_SELECTIONS
              ? ' — remove one to add another'
              : ''}
          </Text>
          <View style={styles.chipGrid}>
            {ALLERGY_OPTIONS.map((opt) => {
              const selected = answers.allergyIds.includes(opt.id);
              const isNone = opt.id === ALLERGY_NONE_ID;
              const atCap =
                allergyRealCount >= MAX_ALLERGY_SELECTIONS &&
                !selected &&
                !isNone;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => toggleAllergy(opt.id)}
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
          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
            Other allergies
          </Text>
          <TextInput
            style={styles.textArea}
            placeholder="e.g. Mango, mustard, celery…"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            multiline
            returnKeyType="done"
            blurOnSubmit
            value={answers.allergyOtherNotes}
            onChangeText={(t) => setNotes('allergyOtherNotes', t)}
            onFocus={scrollNotesToEnd}
            maxLength={300}
          />
        </ScrollView>
      ) : null}

      {current.kind === 'paceKitchen' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.subtitle}>{current.subtitle}</Text>
          <Text style={styles.sectionLabel}>Weight-change pace</Text>
          <View style={styles.chipGrid}>
            {NUTRITION_PACE_OPTIONS.map((opt) => {
              const selected = answers.nutritionPaceId === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setSingle('nutritionPaceId', opt.id)}
                  style={[styles.chip, selected && styles.chipSelected]}>
                  <Text
                    style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
            Meals per day
          </Text>
          <View style={styles.chipGrid}>
            {MEALS_PER_DAY_OPTIONS.map((opt) => {
              const selected = answers.mealsPerDayId === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setSingle('mealsPerDayId', opt.id)}
                  style={[styles.chip, selected && styles.chipSelected]}>
                  <Text
                    style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
            Cooking level
          </Text>
          <View style={styles.chipGrid}>
            {COOKING_SKILL_OPTIONS.map((opt) => {
              const selected = answers.cookingSkillId === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setSingle('cookingSkillId', opt.id)}
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

      {!shouldHideFooterForKeyboard ? (
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
      ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kavRoot: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
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
  progressTrack: {
    height: 5,
    width: '100%',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.gold,
    borderRadius: 2,
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
  sectionLabel: {
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
  textArea: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 14,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.onBackground,
    textAlignVertical: 'top',
  },
  textField: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: theme.fonts.headlineBold,
    fontSize: 20,
    color: theme.colors.onBackground,
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
