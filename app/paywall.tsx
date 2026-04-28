import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoachingWaitlistJoinedModal } from '@/components/CoachingWaitlistJoinedModal';
import { FlightUpgradeOffer } from '@/components/FlightUpgradeOffer';
import {
  isCurrentUserOnCoachingWaitlist,
  submitCoachingWaitlistFromSession,
} from '@/lib/api/coachingWaitlist';
import {
  REVENUECAT_ESSENTIALS_ENTITLEMENT_ID,
  purchaseWeeklyEssentials,
  restoreRevenueCatPurchases,
  revenueCatPurchaseWasCancelled,
} from '@/lib/revenueCat';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const [waitlistJoinedOpen, setWaitlistJoinedOpen] = useState(false);
  const [waitlistBusy, setWaitlistBusy] = useState(false);
  const [essentialsBusy, setEssentialsBusy] = useState(false);
  const [coachingWaitlistJoined, setCoachingWaitlistJoined] = useState(false);
  const tier = useSubscriptionStore((s) => s.tier);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const on = await isCurrentUserOnCoachingWaitlist();
        if (!cancelled && on) setCoachingWaitlistJoined(true);
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const onBuyEssentials = useCallback(async () => {
    setEssentialsBusy(true);
    try {
      await purchaseWeeklyEssentials();
      router.back();
    } catch (error) {
      if (revenueCatPurchaseWasCancelled(error)) return;
      Alert.alert(
        'Could not start purchase',
        error instanceof Error ? error.message : 'Please try again in a moment.'
      );
    } finally {
      setEssentialsBusy(false);
    }
  }, []);

  const onJoinWaitlist = useCallback(async () => {
    if (coachingWaitlistJoined) return;
    setWaitlistBusy(true);
    const res = await submitCoachingWaitlistFromSession();
    setWaitlistBusy(false);
    if (!res.ok) {
      Alert.alert('Could not join waitlist', res.error);
      return;
    }
    setCoachingWaitlistJoined(true);
    setWaitlistJoinedOpen(true);
  }, [coachingWaitlistJoined]);

  const onRestore = useCallback(() => {
    void (async () => {
      setEssentialsBusy(true);
      try {
        const customerInfo = await restoreRevenueCatPurchases();
        const restored = Boolean(
          customerInfo.entitlements.active[REVENUECAT_ESSENTIALS_ENTITLEMENT_ID]
        );
        Alert.alert(
          restored ? 'Purchases restored' : 'No active Essentials purchase found',
          restored
            ? 'Flight Fitness Essentials is active on this account.'
            : 'We did not find an active Essentials subscription for this App Store account.'
        );
      } catch (error) {
        Alert.alert(
          'Could not restore purchases',
          error instanceof Error ? error.message : 'Please try again in a moment.'
        );
      } finally {
        setEssentialsBusy(false);
      }
    })();
  }, []);

  return (
    <>
      <FlightUpgradeOffer
        tier={tier}
        topPadding={insets.top + 18}
        bottomPadding={insets.bottom + 28}
        onEssentials={() => void onBuyEssentials()}
        onCoaching={() => void onJoinWaitlist()}
        onRestore={onRestore}
        essentialsBusy={essentialsBusy}
        coachingBusy={waitlistBusy}
        coachingWaitlistJoined={coachingWaitlistJoined}
      />
      <CoachingWaitlistJoinedModal
        visible={waitlistJoinedOpen}
        onDismiss={() => {
          setWaitlistJoinedOpen(false);
        }}
      />
    </>
  );
}
