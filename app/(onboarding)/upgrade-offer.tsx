import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';

import { FlightUpgradeOffer } from '@/components/FlightUpgradeOffer';
import { theme } from '@/constants/theme';
import { track } from '@/lib/analytics';
import {
  customerHasEssentialsEntitlement,
  getRevenueCatEssentialsPackages,
  packageIdForEssentialsPlan,
  purchaseEssentials,
  restoreRevenueCatPurchases,
  revenueCatPurchaseWasCancelled,
  revenueCatPurchaseErrorCode,
  formatRevenueCatPurchaseError,
  type EssentialsPurchasePlan,
} from '@/lib/revenueCat';
import { viewWeekStartYmdLocal } from '@/lib/weekUtils';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { usePlanStore } from '@/stores/planStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

type OnboardingExit = 'skip' | 'purchase' | 'restore';

function subscriptionPurchaseProps(
  pkg: PurchasesPackage | null
): { price?: number; currency?: string } {
  if (!pkg) return {};
  return {
    price: pkg.product.price,
    currency: pkg.product.currencyCode,
  };
}

/** Hard paywall after onboarding — X skips; primary CTA starts the monthly 3-day trial. */
export default function OnboardingUpgradeOfferScreen() {
  const insets = useSafeAreaInsets();
  const [essentialsBusy, setEssentialsBusy] = useState(false);
  const [packages, setPackages] = useState<{
    monthly: PurchasesPackage | null;
    lifetime: PurchasesPackage | null;
  }>({ monthly: null, lifetime: null });
  const tier = useSubscriptionStore((s) => s.tier);

  useFocusEffect(
    useCallback(() => {
      track('paywall viewed', { source: 'onboarding' });
      let cancelled = false;
      void (async () => {
        const pkgs = await getRevenueCatEssentialsPackages();
        if (!cancelled) setPackages(pkgs);
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const finishOnboarding = useCallback((exit: OnboardingExit) => {
    const onboarding = useOnboardingStore.getState();
    const { answers } = onboarding;
    if (onboarding.completedAt == null) {
      onboarding.complete(new Date().toISOString());
    }
    track('onboarding completed', {
      goal: answers.goal,
      experience: answers.experience,
      training_days: answers.trainingDaysPerWeek,
      equipment_count: answers.equipment.length,
      had_ai_week: exit === 'purchase' || exit === 'restore',
      exit,
    });
    usePlanStore.getState().ensureWeekPlanShell(viewWeekStartYmdLocal());
    router.replace('/(tabs)' as Href);
  }, []);

  const skipPaywall = useCallback(() => {
    finishOnboarding('skip');
  }, [finishOnboarding]);

  const onSelectEssentials = useCallback(
    async (plan: EssentialsPurchasePlan) => {
      const source = 'onboarding';
      const packageId = packageIdForEssentialsPlan(plan);
      track('subscription purchase started', { source, package: packageId, plan });
      setEssentialsBusy(true);
      try {
        await purchaseEssentials(plan);
        const pkg = plan === 'monthly' ? packages.monthly : packages.lifetime;
        track('subscription purchased', {
          source,
          package: packageId,
          plan,
          ...subscriptionPurchaseProps(pkg),
        });
        finishOnboarding('purchase');
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
    },
    [finishOnboarding, packages]
  );

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
            : 'We did not find an active Essentials purchase for this App Store account.'
        );
        if (restored) finishOnboarding('restore');
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
        accessibilityLabel="Continue without subscribing"
        accessibilityRole="button"
        hitSlop={12}>
        <MaterialIcons name="close" size={28} color={theme.colors.onSurfaceVariant} />
      </Pressable>
      <FlightUpgradeOffer
        tier={tier}
        variant="onboarding"
        topPadding={insets.top + 36}
        bottomPadding={insets.bottom + 28}
        showHandle={false}
        onEssentials={(plan) => void onSelectEssentials(plan)}
        onCoachingInfo={() => router.push('/coaching-info')}
        onRestore={onRestore}
        essentialsBusy={essentialsBusy}
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
