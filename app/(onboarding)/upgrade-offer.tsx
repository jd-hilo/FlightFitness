import { router, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoachingWaitlistJoinedModal } from '@/components/CoachingWaitlistJoinedModal';
import { FlightUpgradeOffer } from '@/components/FlightUpgradeOffer';
import { submitCoachingWaitlistFromSession } from '@/lib/api/coachingWaitlist';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

/**
 * Shown after onboarding questions, before the first AI week is generated.
 * Mirrors the paywall plan UI with a “Get 1 week free” path for Free tier.
 */
export default function OnboardingUpgradeOfferScreen() {
  const insets = useSafeAreaInsets();
  const [waitlistJoinedOpen, setWaitlistJoinedOpen] = useState(false);
  const [waitlistBusy, setWaitlistBusy] = useState(false);
  const tier = useSubscriptionStore((s) => s.tier);
  const setTier = useSubscriptionStore((s) => s.setTier);
  const grantOnboardingFreeAiWeek = useSubscriptionStore(
    (s) => s.grantOnboardingFreeAiWeek
  );

  const goGenerate = useCallback(() => {
    router.replace('/(onboarding)/generate' as Href);
  }, []);

  const onGetOneWeekFree = useCallback(() => {
    grantOnboardingFreeAiWeek();
    goGenerate();
  }, [goGenerate, grantOnboardingFreeAiWeek]);

  const onSelectEssentials = useCallback(() => {
    setTier('essentials');
    goGenerate();
  }, [goGenerate, setTier]);

  const onJoinWaitlist = useCallback(async () => {
    setWaitlistBusy(true);
    const res = await submitCoachingWaitlistFromSession();
    setWaitlistBusy(false);
    if (!res.ok) {
      Alert.alert('Could not join waitlist', res.error);
      return;
    }
    setWaitlistJoinedOpen(true);
  }, []);

  const onRestore = useCallback(() => {
    Alert.alert(
      'Restore purchases',
      'Hook up RevenueCat or StoreKit restore here. In this build, use Elite -> dev controls to change tier.'
    );
  }, []);

  return (
    <>
      <FlightUpgradeOffer
        tier={tier}
        topPadding={insets.top + 36}
        bottomPadding={insets.bottom + 28}
        showFreeWeek
        showHandle={false}
        onEssentials={onSelectEssentials}
        onCoaching={() => void onJoinWaitlist()}
        onFreeWeek={onGetOneWeekFree}
        onRestore={onRestore}
        continueBusy={waitlistBusy}
      />
      <CoachingWaitlistJoinedModal
        visible={waitlistJoinedOpen}
        onDismiss={() => {
          setWaitlistJoinedOpen(false);
          router.replace('/(onboarding)/generate' as Href);
        }}
      />
    </>
  );
}
