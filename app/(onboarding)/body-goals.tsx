import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';
import { GOAL_OPTIONS } from '@/lib/onboardingOptions';
import { useOnboardingStore } from '@/stores/onboardingStore';

const MAX_GOALS = 2;

export default function OnboardingBodyGoalsScreen() {
  const answers = useOnboardingStore((s) => s.answers);
  const toggleGoal = useOnboardingStore((s) => s.toggleGoal);
  const goalCount = answers.goal.length;
  const canNext = goalCount > 0;

  return (
    <OnboardingShell
      step={7}
      canNext={canNext}
      backHref="back"
      onNext={() => router.push('/(onboarding)/macro-review')}
      tip="Choose up to two goals — these shape your macros.">
      <Text style={styles.title}>Your fitness goals</Text>
      <Text style={styles.subtitle}>
        Choose up to two — we use these to shape your calorie and macro targets.
      </Text>
      <Text style={styles.capHint}>
        Selected {goalCount} / {MAX_GOALS}
        {goalCount >= MAX_GOALS ? ' — remove one to add another' : ''}
      </Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
        <View style={styles.chipGrid}>
          {GOAL_OPTIONS.map((opt) => {
            const selected = answers.goal.includes(opt.id);
            const atCap = goalCount >= MAX_GOALS && !selected;
            return (
              <Pressable
                key={opt.id}
                onPress={() => !atCap && toggleGoal(opt.id)}
                style={[
                  styles.chip,
                  selected && styles.chipSelected,
                  atCap && { opacity: 0.35 },
                ]}
                disabled={atCap}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </OnboardingShell>
  );
}
