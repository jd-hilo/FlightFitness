import { router } from 'expo-router';
import { ScrollView, Text } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { ScrollNumberPicker } from '@/components/onboarding/ScrollNumberPicker';
import { onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';
import { ageValues } from '@/lib/onboardingOptions';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function OnboardingAgeScreen() {
  const answers = useOnboardingStore((s) => s.answers);
  const setAnswers = useOnboardingStore((s) => s.setAnswers);
  const canNext = answers.ageYears >= 16 && answers.ageYears <= 90;

  return (
    <OnboardingShell
      step={5}
      canNext={canNext}
      backHref="back"
      onNext={() => router.push('/(onboarding)/about-height')}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
        <Text style={styles.title}>Age</Text>
        <Text style={styles.subtitle}>
          Helps personalize your daily calorie target.
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
