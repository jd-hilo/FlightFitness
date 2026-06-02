import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
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
import { useOnboardingStore } from '@/stores/onboardingStore';
import { isAiWeekPlanEnabled } from '@/lib/featureFlags';
import { viewWeekStartYmdLocal } from '@/lib/weekUtils';
import { theme } from '@/constants/theme';

/**
 * Shown after onboarding questions. Subscription optional; no automatic AI week generation.
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

  const finishOnboarding = useCallback(() => {
    usePlanStore.getState().ensureWeekPlanShell(viewWeekStartYmdLocal());
    router.replace('/(tabs)' as Href);
  }, []);

  const skipPaywall = useCallback(() => {
    const onboarding = useOnboardingStore.getState();
    if (onboarding.completedAt == null) {
      onboarding.complete(new Date().toISOString());
    }
    finishOnboarding();
  }, [finishOnboarding]);

  const onGetOneWeekFree = useCallback(() => {
    grantOnboardingFreeAiWeek();
    finishOnboarding();
  }, [finishOnboarding, grantOnboardingFreeAiWeek]);

  const onSelectEssentials = useCallback(async () => {
    setEssentialsBusy(true);
    try {
      await purchaseWeeklyEssentials();
      finishOnboarding();
    } catch (error) {
      if (revenueCatPurchaseWasCancelled(error)) return;
      const message = formatRevenueCatPurchaseError(error);
      if (!message) return;
      Alert.alert('Could not start purchase', message);
    } finally {
      setEssentialsBusy(false);
    }
  }, [finishOnboarding]);

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
        if (restored) finishOnboarding();
      } catch (error) {
        Alert.alert(
          'Could not restore purchases',
          formatRevenueCatPurchaseError(error) || 'Please try again in a moment.'
        );
      } finally {
        setEssentialsBusy(false);
      }
    })();
  }, [finishOnboarding]);

  return (
    <View style={styles.root}>
      <Pressable
        style={[styles.closeBtn, { top: insets.top + 8 }]}
        onPress={skipPaywall}
        accessibilityLabel="Skip paywall"
        accessibilityRole="button"
        hitSlop={12}>
        <MaterialIcons name="close" size={28} color={theme.colors.onSurfaceVariant} />
      </Pressable>
      <FlightUpgradeOffer
        tier={tier}
        topPadding={insets.top + 36}
        bottomPadding={insets.bottom + 28}
        showFreeWeek={isAiWeekPlanEnabled()}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    padding: 8,
  },
});
