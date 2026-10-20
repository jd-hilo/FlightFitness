import { router, type Href } from 'expo-router';
import { Text, View } from 'react-native';

import { backOrReplace } from '@/components/onboarding/backOrReplace';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';

export default function IntakeProofScreen() {
  return (
    <OnboardingShell
      step={1}
      showProgress={false}
      canNext
      nextLabel="Continue"
      onBackPress={() => backOrReplace('/(intake)/age' as Href)}
      onNext={() => router.push('/(onboarding)/faith-goals' as Href)}>
      <View style={styles.proofBody}>
        <Text style={styles.title}>Closer, and stronger</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoBody}>
            People who train and study scripture say they feel closer to God, and stronger, within a
            few weeks.
          </Text>
        </View>
      </View>
    </OnboardingShell>
  );
}
