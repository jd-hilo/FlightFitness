import { router, type Href } from 'expo-router';
import { ScrollView, Text } from 'react-native';

import { backOrReplace } from '@/components/onboarding/backOrReplace';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { ScrollNumberPicker } from '@/components/onboarding/ScrollNumberPicker';
import { INTAKE_STEP_COUNT, onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';
import { AGE_MAX, AGE_MIN, ageValues } from '@/lib/onboardingOptions';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function IntakeAgeScreen() {
  const answers = useOnboardingStore((s) => s.answers);
  const setAnswers = useOnboardingStore((s) => s.setAnswers);
  const setIntakeComplete = useOnboardingStore((s) => s.setIntakeComplete);
  const ageOk = answers.ageYears >= AGE_MIN && answers.ageYears <= AGE_MAX;
  const earlierReady =
    answers.goal.length > 0 && answers.experience.length > 0 && answers.faithTenure.length > 0;
  const canNext = earlierReady && ageOk;

  return (
    <OnboardingShell
      step={4}
      totalSteps={INTAKE_STEP_COUNT}
      canNext={canNext}
      onBackPress={() => backOrReplace('/(intake)/faith-tenure' as Href)}
      onNext={() => {
        setIntakeComplete(true);
        router.push('/(intake)/proof' as Href);
      }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
        <Text style={styles.title}>How old are you?</Text>
        <Text style={styles.subtitle}>
          {earlierReady
            ? 'Scroll if this is not your age, then continue.'
            : 'Go back and answer the earlier questions first.'}
        </Text>
        <ScrollNumberPicker
          label="Age"
          values={ageValues()}
          value={answers.ageYears}
          formatItem={(v) => `${v} years`}
          onChange={(v) => setAnswers({ ageYears: v })}
        />
      </ScrollView>
    </OnboardingShell>
  );
}
