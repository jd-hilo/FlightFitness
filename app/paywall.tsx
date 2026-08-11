import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';

import { FlightUpgradeOffer } from '@/components/FlightUpgradeOffer';
import { theme } from '@/constants/theme';
import { track, type PaywallSource } from '@/lib/analytics';
import {
  customerHasEssentialsEntitlement,
  fetchEssentialsOwnership,
  getRevenueCatEssentialsPackages,
  packageIdForEssentialsPlan,
  purchaseEssentials,
  refreshRevenueCatCustomerInfo,
  restoreRevenueCatPurchases,
  revenueCatPurchaseWasCancelled,
  revenueCatPurchaseErrorCode,
  formatRevenueCatPurchaseError,
  type EssentialsPurchasePlan,
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
    value === 'elite' ||
    value === 'insights_gate' ||
    value === 'rest_verses_gate'
  ) {
    return value;
  }
  return 'unknown';
}

function subscriptionPurchaseProps(
  pkg: PurchasesPackage | null
): { price?: number; currency?: string } {
  if (!pkg) return {};
  return {
    price: pkg.product.price,
    currency: pkg.product.currencyCode,
  };
}

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { source: sourceParam } = useLocalSearchParams<{ source?: string }>();
  const source = parsePaywallSource(sourceParam);
  const [essentialsBusy, setEssentialsBusy] = useState(false);
  const [packages, setPackages] = useState<{
    monthly: PurchasesPackage | null;
    lifetime: PurchasesPackage | null;
  }>({ monthly: null, lifetime: null });
  const tier = useSubscriptionStore((s) => s.tier);

  useFocusEffect(
    useCallback(() => {
      track('paywall viewed', { source });
      let cancelled = false;
      void refreshRevenueCatCustomerInfo();
      void (async () => {
        const pkgs = await getRevenueCatEssentialsPackages();
        if (!cancelled) setPackages(pkgs);
      })();
      return () => {
        cancelled = true;
      };
    }, [source])
  );

  const onBuyEssentials = useCallback(
    async (plan: EssentialsPurchasePlan) => {
      if (tier === 'coaching') return;
      const ownership = await fetchEssentialsOwnership();
      if (plan === 'monthly' && (ownership.hasMonthly || ownership.hasLifetime)) return;
      if (plan === 'lifetime' && ownership.hasLifetime) return;

      const packageId = packageIdForEssentialsPlan(plan);
      track('subscription purchase started', { source, package: packageId });
      setEssentialsBusy(true);
      try {
        await purchaseEssentials(plan);
        const pkg = plan === 'monthly' ? packages.monthly : packages.lifetime;
        track('subscription purchased', {
          source,
          package: packageId,
          ...subscriptionPurchaseProps(pkg),
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
    },
    [source, tier, packages]
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
    <View style={styles.root}>
      <Pressable
        style={[styles.closeBtn, { top: insets.top + 8 }]}
        onPress={() => router.back()}
        accessibilityLabel="Close paywall"
        accessibilityRole="button"
        hitSlop={12}>
        <MaterialIcons name="close" size={28} color={theme.colors.onSurfaceVariant} />
      </Pressable>
      <FlightUpgradeOffer
        tier={tier}
        topPadding={insets.top + 36}
        bottomPadding={insets.bottom + 28}
        onEssentials={(plan) => void onBuyEssentials(plan)}
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
