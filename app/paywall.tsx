import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoachingWaitlistJoinedModal } from '@/components/CoachingWaitlistJoinedModal';
import { FlightUpgradeOffer } from '@/components/FlightUpgradeOffer';
import { submitCoachingWaitlistFromSession } from '@/lib/api/coachingWaitlist';
import {
  type SubscriptionTier,
  useSubscriptionStore,
} from '@/stores/subscriptionStore';

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const [waitlistJoinedOpen, setWaitlistJoinedOpen] = useState(false);
  const [waitlistBusy, setWaitlistBusy] = useState(false);
  const tier = useSubscriptionStore((s) => s.tier);
  const setTier = useSubscriptionStore((s) => s.setTier);

  const selectTier = useCallback(
    (next: SubscriptionTier) => {
      if (next === 'free') return;
      setTier(next);
      router.back();
    },
    [setTier]
  );

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
        topPadding={insets.top + 18}
        bottomPadding={insets.bottom + 28}
        onEssentials={() => selectTier('essentials')}
        onCoaching={() => void onJoinWaitlist()}
        onRestore={onRestore}
        continueBusy={waitlistBusy}
      />
      <CoachingWaitlistJoinedModal
        visible={waitlistJoinedOpen}
        onDismiss={() => {
          setWaitlistJoinedOpen(false);
          router.back();
        }}
      />
    </>
  );
}
