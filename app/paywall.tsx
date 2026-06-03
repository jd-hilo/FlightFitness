import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';

import { CoachingWaitlistJoinedModal } from '@/components/CoachingWaitlistJoinedModal';
import { FlightUpgradeOffer } from '@/components/FlightUpgradeOffer';
import {
  isCurrentUserOnCoachingWaitlist,
  submitCoachingWaitlistFromSession,
} from '@/lib/api/coachingWaitlist';
import { track, type PaywallSource } from '@/lib/analytics';
import {
  customerHasEssentialsEntitlement,
  getRevenueCatWeeklyPackage,
  purchaseWeeklyEssentials,
  refreshRevenueCatCustomerInfo,
  restoreRevenueCatPurchases,
  revenueCatPurchaseWasCancelled,
  revenueCatPurchaseErrorCode,
  formatRevenueCatPurchaseError,
  REVENUECAT_WEEKLY_PACKAGE_ID,
} from '@/lib/revenueCat';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

function parsePaywallSource(raw: string | string[] | undefined): PaywallSource {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (
    value === 'onboarding' ||
    value === 'train_gate' ||
    value === 'fuel_gate' ||
    value === 'coach_chat' ||
    value === 'badge' ||
    value === 'elite'
  ) {
    return value;
  }
  return 'unknown';
}

function subscriptionPurchaseProps(
  weeklyPackage: PurchasesPackage | null
): { price?: number; currency?: string } {
  if (!weeklyPackage) return {};
  return {
    price: weeklyPackage.product.price,
    currency: weeklyPackage.product.currencyCode,
  };
}

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { source: sourceParam } = useLocalSearchParams<{ source?: string }>();
  const source = parsePaywallSource(sourceParam);
  const [waitlistJoinedOpen, setWaitlistJoinedOpen] = useState(false);
  const [waitlistBusy, setWaitlistBusy] = useState(false);
  const [essentialsBusy, setEssentialsBusy] = useState(false);
  const [coachingWaitlistJoined, setCoachingWaitlistJoined] = useState(false);
  const [weeklyPackage, setWeeklyPackage] = useState<PurchasesPackage | null>(null);
  const tier = useSubscriptionStore((s) => s.tier);

  useFocusEffect(
    useCallback(() => {
      track('paywall viewed', { source });
      let cancelled = false;
      void refreshRevenueCatCustomerInfo();
      void (async () => {
        const on = await isCurrentUserOnCoachingWaitlist();
        if (!cancelled && on) setCoachingWaitlistJoined(true);
        const pkg = await getRevenueCatWeeklyPackage();
        if (!cancelled) setWeeklyPackage(pkg);
      })();
      return () => {
        cancelled = true;
      };
    }, [source])
  );

  const onBuyEssentials = useCallback(async () => {
    if (tier === 'essentials' || tier === 'coaching') return;
    track('subscription purchase started', {
      source,
      package: REVENUECAT_WEEKLY_PACKAGE_ID,
    });
    setEssentialsBusy(true);
    try {
      await purchaseWeeklyEssentials();
      track('subscription purchased', {
        source,
        package: REVENUECAT_WEEKLY_PACKAGE_ID,
        ...subscriptionPurchaseProps(weeklyPackage),
      });
      router.back();
    } catch (error) {
      track('subscription purchase failed', {
        source,
        error_code: revenueCatPurchaseErrorCode(error),
        cancelled: revenueCatPurchaseWasCancelled(error),
      });
      if (revenueCatPurchaseWasCancelled(error)) return;
      const message = formatRevenueCatPurchaseError(error);
      if (!message) return;
      Alert.alert('Could not start purchase', message);
    } finally {
      setEssentialsBusy(false);
    }
  }, [source, tier, weeklyPackage]);

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
        const restored = customerHasEssentialsEntitlement(customerInfo);
        Alert.alert(
          restored ? 'Purchases restored' : 'No active Essentials purchase found',
          restored
            ? 'Flight Fitness Essentials is active on this account.'
            : 'We did not find an active Essentials subscription for this App Store account.'
        );
      } catch (error) {
        Alert.alert(
          'Could not restore purchases',
          formatRevenueCatPurchaseError(error) || 'Please try again in a moment.'
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
