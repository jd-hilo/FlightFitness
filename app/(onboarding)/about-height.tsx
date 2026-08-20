import { router } from 'expo-router';
import { ScrollView, Text } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { ScrollNumberPicker } from '@/components/onboarding/ScrollNumberPicker';
import { onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';
import { formatHeightInchesLabel, heightInchesValues } from '@/lib/onboardingOptions';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function OnboardingHeightScreen() {
  const answers = useOnboardingStore((s) => s.answers);
  const setAnswers = useOnboardingStore((s) => s.setAnswers);
  const canNext = answers.heightInches >= 54 && answers.heightInches <= 84;

  return (
    <OnboardingShell
      step={6}
      canNext={canNext}
      backHref="back"
      onNext={() => router.push('/(onboarding)/body-goals')}
      tip="Scroll to your height, then continue.">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
        <Text style={styles.title}>Height</Text>
        <Text style={styles.subtitle}>
          Combined with weight and age for your macro recommendation.
        </Text>
        <ScrollNumberPicker
          label="Height"
          values={heightInchesValues()}
          value={answers.heightInches}
          formatItem={formatHeightInchesLabel}
          onChange={(v) => setAnswers({ heightInches: v })}
        />
      </ScrollView>
    </OnboardingShell>
  );
}
