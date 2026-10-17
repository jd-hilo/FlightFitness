import { router, type Href } from 'expo-router';
import { ScrollView, Text } from 'react-native';

import { backOrReplace } from '@/components/onboarding/backOrReplace';
import { ChoiceChips } from '@/components/onboarding/ChoiceChips';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { INTAKE_STEP_COUNT, onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';
import { GOAL_OPTIONS } from '@/lib/onboardingOptions';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function FitnessGoalScreen() {
  const goal = useOnboardingStore((s) => s.answers.goal);
  const setAnswers = useOnboardingStore((s) => s.setAnswers);
  const canNext = goal.length > 0;

  return (
    <OnboardingShell
      step={1}
      totalSteps={INTAKE_STEP_COUNT}
      canNext={canNext}
      onBackPress={() => backOrReplace('/welcome' as Href)}
      onNext={() => router.push('/(intake)/lifting' as Href)}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
        <Text style={styles.title}>What is your fitness goal?</Text>
        <Text style={styles.subtitle}>Choose one.</Text>
        <ChoiceChips
          options={GOAL_OPTIONS}
          isSelected={(id) => goal.includes(id)}
          onPress={(id) => setAnswers({ goal: [id] })}
        />
      </ScrollView>
    </OnboardingShell>
  );
}
