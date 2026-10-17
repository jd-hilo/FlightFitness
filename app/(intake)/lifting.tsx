import { router, type Href } from 'expo-router';
import { ScrollView, Text } from 'react-native';

import { backOrReplace } from '@/components/onboarding/backOrReplace';
import { ChoiceChips } from '@/components/onboarding/ChoiceChips';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { INTAKE_STEP_COUNT, onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';
import { EXPERIENCE_OPTIONS } from '@/lib/onboardingOptions';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function LiftingScreen() {
  const experience = useOnboardingStore((s) => s.answers.experience);
  const setSingle = useOnboardingStore((s) => s.setSingle);

  return (
    <OnboardingShell
      step={2}
      totalSteps={INTAKE_STEP_COUNT}
      canNext={experience.length > 0}
      onBackPress={() => backOrReplace('/(intake)/fitness-goal' as Href)}
      onNext={() => router.push('/(intake)/faith-tenure' as Href)}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
        <Text style={styles.title}>How long have you been lifting?</Text>
        <Text style={styles.subtitle}>Choose the closest match.</Text>
        <ChoiceChips
          options={EXPERIENCE_OPTIONS}
          isSelected={(id) => experience === id}
          onPress={(id) => setSingle('experience', id)}
        />
      </ScrollView>
    </OnboardingShell>
  );
}
