import { router, type Href } from 'expo-router';
import { ScrollView, Text } from 'react-native';

import { backOrReplace } from '@/components/onboarding/backOrReplace';
import { ChoiceChips } from '@/components/onboarding/ChoiceChips';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { INTAKE_STEP_COUNT, onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';
import { FAITH_TENURE_OPTIONS } from '@/lib/onboardingOptions';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function FaithTenureScreen() {
  const faithTenure = useOnboardingStore((s) => s.answers.faithTenure);
  const setSingle = useOnboardingStore((s) => s.setSingle);

  return (
    <OnboardingShell
      step={3}
      totalSteps={INTAKE_STEP_COUNT}
      canNext={faithTenure.length > 0}
      onBackPress={() => backOrReplace('/(intake)/lifting' as Href)}
      onNext={() => router.push('/(intake)/age' as Href)}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
        <Text style={styles.title}>How long have you been in faith?</Text>
        <Text style={styles.subtitle}>Choose one.</Text>
        <ChoiceChips
          options={FAITH_TENURE_OPTIONS}
          isSelected={(id) => faithTenure === id}
          onPress={(id) => setSingle('faithTenure', id)}
        />
      </ScrollView>
    </OnboardingShell>
  );
}
