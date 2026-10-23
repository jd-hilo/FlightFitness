import { router, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ScrollView, Text } from 'react-native';

import { backOrReplace } from '@/components/onboarding/backOrReplace';
import { ChoiceChips } from '@/components/onboarding/ChoiceChips';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';
import { track } from '@/lib/analytics';
import { FAITH_GOAL_OPTIONS, MAX_FAITH_GOALS } from '@/lib/onboardingOptions';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function FaithGoalsScreen() {
  const faithGoals = useOnboardingStore((s) => s.answers.faithGoals);
  const toggleFaithGoal = useOnboardingStore((s) => s.toggleFaithGoal);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    track('onboarding started', { entry_point: 'post_auth' });
  }, []);

  return (
    <OnboardingShell
      step={1}
      canNext={faithGoals.length > 0}
      onBackPress={() => backOrReplace('/(intake)/proof' as Href)}
      onNext={() => router.push('/(onboarding)/feature-slides' as Href)}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
        <Text style={styles.title}>What do you want for your faith?</Text>
        <Text style={styles.subtitle}>Choose up to three.</Text>
        <Text style={styles.capHint}>
          Selected {faithGoals.length} / {MAX_FAITH_GOALS}
          {faithGoals.length >= MAX_FAITH_GOALS ? ' — remove one to add another' : ''}
        </Text>
        <ChoiceChips
          options={FAITH_GOAL_OPTIONS}
          isSelected={(id) => faithGoals.includes(id)}
          isDisabled={(id) => faithGoals.length >= MAX_FAITH_GOALS && !faithGoals.includes(id)}
          onPress={toggleFaithGoal}
        />
      </ScrollView>
    </OnboardingShell>
  );
}
