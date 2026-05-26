import { useFocusEffect } from '@react-navigation/native';
import { router, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
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
  formatRevenueCatPurchaseError,
} from '@/lib/revenueCat';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { usePlanStore } from '@/stores/planStore';
import { viewWeekStartYmdLocal } from '@/lib/weekUtils';
import { theme } from '@/constants/theme';

/**
 * Shown after onboarding questions, before the first AI week is generated.
 * Mirrors the paywall plan UI with a “Get 1 week free” path for Free tier.
 */
export default function OnboardingUpgradeOfferScreen() {
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
  const grantOnboardingFreeAiWeek = useSubscriptionStore(
    (s) => s.grantOnboardingFreeAiWeek
  );

  const goGenerate = useCallback(() => {
    router.replace('/(onboarding)/generate' as Href);
  }, []);

  const goManual = useCallback(() => {
    usePlanStore.getState().ensureWeekPlanShell(viewWeekStartYmdLocal());
    router.replace('/(tabs)' as Href);
  }, []);

  const onGetOneWeekFree = useCallback(() => {
    grantOnboardingFreeAiWeek();
    goGenerate();
  }, [goGenerate, grantOnboardingFreeAiWeek]);

  const onSelectEssentials = useCallback(async () => {
    setEssentialsBusy(true);
    try {
      await purchaseWeeklyEssentials();
      goGenerate();
    } catch (error) {
      if (revenueCatPurchaseWasCancelled(error)) return;
      const message = formatRevenueCatPurchaseError(error);
      if (!message) return;
      Alert.alert('Could not start purchase', message);
    } finally {
      setEssentialsBusy(false);
    }
  }, [goGenerate]);

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
        if (restored) goGenerate();
      } catch (error) {
        Alert.alert(
          'Could not restore purchases',
          formatRevenueCatPurchaseError(error) || 'Please try again in a moment.'
        );
      } finally {
        setEssentialsBusy(false);
      }
    })();
  }, [goGenerate]);

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
        coachingWaitlistJoined={coachingWaitlistJoined}
      />
      <CoachingWaitlistJoinedModal
        visible={waitlistJoinedOpen}
        onDismiss={() => {
          setWaitlistJoinedOpen(false);
        }}
      />
      <Pressable style={[styles.manualBtn, { bottom: insets.bottom + 24 }]} onPress={goManual}>
        <Text style={styles.manualBtnTxt}>Start building manually</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  manualBtn: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  manualBtnTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.5,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
});
