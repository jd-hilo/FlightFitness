import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';

import { RestTimerOverlay } from '@/components/workout/RestTimerOverlay';
import { theme } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { resolveDailyVerse } from '@/lib/dailyVerse';
import { completeOnboardingAfterFirstSession, ONBOARDING_DEMO_REST_SEC } from '@/lib/onboardingFirstSession';
import { prefetchVersePassage } from '@/lib/versePassageCache';
import { useDailyContentStore } from '@/stores/dailyContentStore';

export default function OnboardingFirstRestScreen() {
  const [visible, setVisible] = useState(true);
  const finishing = useRef(false);
  const dailyContent = useDailyContentStore((s) => s.content);
  const verse = resolveDailyVerse(dailyContent);

  useEffect(() => {
    void useDailyContentStore.getState().load();
  }, []);

  useEffect(() => {
    prefetchVersePassage(verse);
  }, [verse]);

  const finish = useCallback(() => {
    if (finishing.current) return;
    finishing.current = true;
    setVisible(false);
    void (async () => {
      const res = await completeOnboardingAfterFirstSession({ seedWorkout: true });
      if (!res.ok) {
        finishing.current = false;
        setVisible(true);
        Alert.alert(
          'Could not save your profile',
          `${res.error}\n\nCheck your connection and try again.`
        );
        return;
      }
      router.replace('/(onboarding)/upgrade-offer' as Href);
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <RestTimerOverlay
        visible={visible}
        seconds={ONBOARDING_DEMO_REST_SEC}
        verse={verse}
        verseSubtitle="Today's word"
        nextLabel="That's the loop"
        celebrateKey={1}
        coachTip="Tap the verse to read the full passage — or skip rest to keep going."
        autoAdvance={false}
        onOpenPassage={() => track('onboarding rest verse opened')}
        onSkip={() => {
          track('onboarding rest skipped');
          finish();
        }}
        onComplete={() => {
          track('onboarding rest completed');
          finish();
        }}
      />
    </View>
  );
}
