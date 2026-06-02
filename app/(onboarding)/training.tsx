import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';
import {
  EQUIPMENT_OPTIONS,
  EXPERIENCE_OPTIONS,
  isEquipmentOptionDisabled,
} from '@/lib/onboardingOptions';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function OnboardingTrainingScreen() {
  const answers = useOnboardingStore((s) => s.answers);
  const setSingle = useOnboardingStore((s) => s.setSingle);
  const toggleEquipment = useOnboardingStore((s) => s.toggleEquipment);
  const canNext = answers.experience.length > 0 && answers.equipment.length > 0;

  return (
    <OnboardingShell
      step={9}
      canNext={canNext}
      backHref="back"
      onNext={() => router.push('/(onboarding)/workouts-intro')}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
        <Text style={styles.title}>Training</Text>
        <Text style={styles.subtitle}>
          Tell us about your gym setup so Train fits how you actually work out.
        </Text>

        <Text style={styles.sectionLabel}>Experience</Text>
        <View style={styles.chipGrid}>
          {EXPERIENCE_OPTIONS.map((opt) => {
            const selected = answers.experience === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => setSingle('experience', opt.id)}
                style={[styles.chip, selected && styles.chipSelected]}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Equipment access</Text>
        <View style={styles.chipGrid}>
          {EQUIPMENT_OPTIONS.map((opt) => {
            const selected = answers.equipment.includes(opt.id);
            const disabled = isEquipmentOptionDisabled(answers.equipment, opt.id);
            return (
              <Pressable
                key={opt.id}
                onPress={() => !disabled && toggleEquipment(opt.id)}
                style={[
                  styles.chip,
                  selected && styles.chipSelected,
                  disabled && { opacity: 0.35 },
                ]}
                disabled={disabled}>
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
