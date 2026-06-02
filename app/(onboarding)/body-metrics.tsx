import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { WeightPicker } from '@/components/onboarding/WeightPicker';
import { onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function OnboardingCurrentWeightScreen() {
  const answers = useOnboardingStore((s) => s.answers);
  const setWeight = useOnboardingStore((s) => s.setWeight);
  const canNext = answers.currentWeightLb >= 80 && answers.currentWeightLb <= 400;

  return (
    <OnboardingShell
      step={2}
      canNext={canNext}
      backHref="back"
      onNext={() => router.push('/(onboarding)/target-weight')}>
      <Text style={styles.title}>Current weight</Text>
      <Text style={styles.subtitle}>
        Where you are today — we use this to estimate maintenance calories.
      </Text>
      <View style={styles.weightScroll}>
        <WeightPicker
          label="Current weight"
          hint="Pounds (lb)"
          value={answers.currentWeightLb}
          onChange={(lb) => setWeight('currentWeightLb', lb)}
        />
      </View>
    </OnboardingShell>
  );
}
