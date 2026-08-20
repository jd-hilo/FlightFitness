import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { WeightPicker } from '@/components/onboarding/WeightPicker';
import { onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function OnboardingTargetWeightScreen() {
  const answers = useOnboardingStore((s) => s.answers);
  const setWeight = useOnboardingStore((s) => s.setWeight);
  const canNext = answers.targetWeightLb >= 80 && answers.targetWeightLb <= 400;

  return (
    <OnboardingShell
      step={3}
      canNext={canNext}
      backHref="back"
      onNext={() => router.push('/(onboarding)/about-sex')}
      tip="Pick the weight you're working toward.">
      <Text style={styles.title}>Target weight</Text>
      <Text style={styles.subtitle}>
        Where you want to be — this shapes your calorie deficit or surplus.
      </Text>
      <View style={styles.weightScroll}>
        <WeightPicker
          label="Target weight"
          hint="Pounds (lb)"
          value={answers.targetWeightLb}
          onChange={(lb) => setWeight('targetWeightLb', lb)}
        />
      </View>
    </OnboardingShell>
  );
}
