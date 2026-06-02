import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';
import { theme } from '@/constants/theme';
import { persistProfileOnboarding } from '@/lib/api/profileOnboarding';
import { viewWeekStartYmdLocal } from '@/lib/weekUtils';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { usePlanStore } from '@/stores/planStore';

export default function OnboardingWorkoutsIntroScreen() {
  const answers = useOnboardingStore((s) => s.answers);
  const complete = useOnboardingStore((s) => s.complete);
  const macroTargets = usePlanStore((s) => s.macroTargets);
  const ensureWeekPlanShell = usePlanStore((s) => s.ensureWeekPlanShell);
  const [busy, setBusy] = useState(false);

  const onNext = () => {
    if (busy) return;
    if (!macroTargets) {
      Alert.alert('Missing macros', 'Go back and save your macro targets first.');
      return;
    }
    setBusy(true);
    void (async () => {
      const completedAt = new Date().toISOString();
      const res = await persistProfileOnboarding(answers, completedAt, macroTargets);
      if (!res.ok) {
        setBusy(false);
        Alert.alert(
          'Could not save your profile',
          `${res.error}\n\nCheck your connection and try again.`
        );
        return;
      }
      complete(completedAt);
      ensureWeekPlanShell(viewWeekStartYmdLocal());
      usePlanStore.getState().setMacroTargets(macroTargets);
      router.replace('/(onboarding)/upgrade-offer' as Href);
    })();
  };

  return (
    <OnboardingShell
      step={10}
      canNext={!busy && macroTargets != null}
      backHref="back"
      onNext={onNext}
      nextLabel={busy ? 'Saving…' : 'Continue'}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
        <Text style={styles.title}>Build your training</Text>
        <Text style={styles.subtitle}>
          Flight Fitness is built for athletes who want control — not a cookie-cutter program.
        </Text>
        <View style={styles.infoCard}>
          <MaterialIcons name="fitness-center" size={32} color={theme.colors.gold} />
          <Text style={[styles.infoTitle, { marginTop: 12 }]}>Create your own workouts</Text>
          <Text style={styles.infoBody}>
            On the Train tab, tap Create workout to build sessions with your exercises, sets, and
            rest timers. Log workouts, track progress, and adjust anytime.
          </Text>
        </View>
        <Text style={[styles.subtitle, { marginTop: 16 }]}>
          Optional Essentials unlocks unlimited saved workouts and more. You can skip and start
          building for free.
        </Text>
      </ScrollView>
    </OnboardingShell>
  );
}
