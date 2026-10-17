import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { backOrReplace } from '@/components/onboarding/backOrReplace';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';

const SLIDES = [
  {
    kicker: 'Strength',
    title: 'Improve your strength by tracking workouts.',
    body: 'Log each set. The next session starts from what you actually lifted.',
  },
  {
    kicker: 'Faith',
    title: 'Improve your faith by studying scripture between sets and outside of sets.',
    body: 'A verse while you rest, and time in the Word when you are away from the gym.',
  },
] as const;

export default function FeatureSlidesScreen() {
  const [slide, setSlide] = useState(0);
  const current = SLIDES[slide] ?? SLIDES[0];
  const last = slide >= SLIDES.length - 1;

  return (
    <OnboardingShell
      step={3}
      canNext
      onBackPress={() => {
        if (slide > 0) {
          setSlide((value) => value - 1);
          return;
        }
        backOrReplace('/(onboarding)/first-workout' as Href);
      }}
      onNext={() => {
        if (!last) {
          setSlide((value) => value + 1);
          return;
        }
        router.replace('/(onboarding)/upgrade-offer' as Href);
      }}>
      <View style={styles.proofBody}>
        <Text style={styles.capHint}>
          {slide + 1} / {SLIDES.length}
        </Text>
        <Text style={styles.sectionLabel}>{current.kicker}</Text>
        <Text style={[styles.title, { textTransform: 'none' }]}>{current.title}</Text>
        <Text style={styles.infoBody}>{current.body}</Text>
      </View>
    </OnboardingShell>
  );
}
