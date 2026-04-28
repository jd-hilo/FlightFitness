import { router, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoachingWaitlistJoinedModal } from '@/components/CoachingWaitlistJoinedModal';
import { FlightUpgradeOffer } from '@/components/FlightUpgradeOffer';
import { submitCoachingWaitlistFromSession } from '@/lib/api/coachingWaitlist';
import {
  REVENUECAT_ESSENTIALS_ENTITLEMENT_ID,
  presentEssentialsPaywallIfNeeded,
  purchaseWeeklyEssentials,
  restoreRevenueCatPurchases,
  revenueCatPaywallCompleted,
  revenueCatPurchaseWasCancelled,
} from '@/lib/revenueCat';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

/**
 * Shown after onboarding questions, before the first AI week is generated.
 * Mirrors the paywall plan UI with a “Get 1 week free” path for Free tier.
 */
export default function OnboardingUpgradeOfferScreen() {
  const insets = useSafeAreaInsets();
  const [waitlistJoinedOpen, setWaitlistJoinedOpen] = useState(false);
  const [waitlistBusy, setWaitlistBusy] = useState(false);
  const [essentialsBusy, setEssentialsBusy] = useState(false);
  const tier = useSubscriptionStore((s) => s.tier);
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

  const onSelectEssentials = useCallback(async () => {
    setEssentialsBusy(true);
    try {
      const { result } = await presentEssentialsPaywallIfNeeded();
      if (revenueCatPaywallCompleted(result)) {
        goGenerate();
      }
    } catch (paywallError) {
      if (revenueCatPurchaseWasCancelled(paywallError)) return;

      try {
        await purchaseWeeklyEssentials();
        goGenerate();
      } catch (purchaseError) {
        if (revenueCatPurchaseWasCancelled(purchaseError)) return;
        Alert.alert(
          'Could not start purchase',
          purchaseError instanceof Error
            ? purchaseError.message
            : 'Please try again in a moment.'
        );
      }
    } finally {
      setEssentialsBusy(false);
    }
  }, [goGenerate]);

  const onJoinWaitlist = useCallback(async () => {
    setWaitlistBusy(true);
    const res = await submitCoachingWaitlistFromSession();
    setWaitlistBusy(false);
    if (!res.ok) {
      Alert.alert('Could not join waitlist', res.error);
      return;
    }
    setWaitlistJoinedOpen(true);
  }, [goGenerate]);

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
        if (restored) goGenerate();
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
        topPadding={insets.top + 36}
        bottomPadding={insets.bottom + 28}
        showFreeWeek
        showHandle={false}
        onEssentials={() => void onSelectEssentials()}
        onCoaching={() => void onJoinWaitlist()}
        onFreeWeek={onGetOneWeekFree}
        onRestore={onRestore}
        essentialsBusy={essentialsBusy}
        coachingBusy={waitlistBusy}
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
