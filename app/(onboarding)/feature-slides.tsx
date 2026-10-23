import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { backOrReplace } from '@/components/onboarding/backOrReplace';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';
import { theme } from '@/constants/theme';

const SLIDES = [
  {
    kicker: 'Train',
    title: 'Improve your strength',
    body: 'Log each set. The next session starts from what you actually lifted.',
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    image: require('../../assets/images/onboarding/3d-train.jpg') as number,
  },
  {
    kicker: 'Faith',
    title: 'Improve your faith',
    body: 'A verse while you rest, and time in the Word when you are away from the gym.',
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    image: require('../../assets/images/onboarding/3d-faith.jpg') as number,
  },
] as const;

export default function FeatureSlidesScreen() {
  const [slide, setSlide] = useState(0);
  const current = SLIDES[slide] ?? SLIDES[0];
  const last = slide >= SLIDES.length - 1;
  const { width } = useWindowDimensions();
  const imgSize = Math.round(width * 0.6);

  return (
    <OnboardingShell
      step={2}
      canNext
      onBackPress={() => {
        if (slide > 0) {
          setSlide((value) => value - 1);
          return;
        }
        backOrReplace('/(onboarding)/faith-goals' as Href);
      }}
      onNext={() => {
        if (!last) {
          setSlide((value) => value + 1);
          return;
        }
        router.replace('/(onboarding)/upgrade-offer' as Href);
      }}>
      <View style={local.body}>
        <Text style={styles.sectionLabel}>{current.kicker}</Text>
        <View style={local.art}>
          <Image
            source={current.image}
            style={[local.image, { width: imgSize, height: imgSize }]}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.subtitle}>{current.body}</Text>
      </View>
    </OnboardingShell>
  );
}

const local = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  art: {
    alignItems: 'center',
    marginBottom: 8,
  },
  image: {
    marginBottom: 4,
  },
});
