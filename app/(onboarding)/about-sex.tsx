import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';
import { SEX_OPTIONS } from '@/lib/onboardingOptions';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function OnboardingSexScreen() {
  const answers = useOnboardingStore((s) => s.answers);
  const setSingle = useOnboardingStore((s) => s.setSingle);
  const canNext = answers.sex.length > 0;

  return (
    <OnboardingShell
      step={4}
      canNext={canNext}
      backHref="back"
      onNext={() => router.push('/(onboarding)/about-age')}
      tip="Tap one — we use this for calorie math.">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
        <Text style={styles.title}>Sex</Text>
        <Text style={styles.subtitle}>
          Used for calorie estimates. You can update this anytime in your profile.
        </Text>
        <View style={styles.chipGrid}>
          {SEX_OPTIONS.map((opt) => {
            const selected = answers.sex === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => setSingle('sex', opt.id)}
                style={[styles.chip, selected && styles.chipSelected]}>
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
