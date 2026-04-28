import { useEffect } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { isRegisteredAppUser } from '@/lib/useRegisteredAuth';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

/**
 * Public RevenueCat SDK keys (safe in the client). Set via EAS / `.env` — never commit secrets.
 * iOS: Project settings → API keys → your iOS app → Public SDK key.
 */
const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? '';
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? '';

/**
 * RevenueCat entitlement identifier for "Flight Fitness Essentials".
 * If the dashboard identifier differs, set EXPO_PUBLIC_REVENUECAT_ESSENTIALS_ENTITLEMENT_ID.
 */
export const REVENUECAT_ESSENTIALS_ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_ESSENTIALS_ENTITLEMENT_ID ?? 'essentials';

/** Current offering package identifier for the weekly Essentials product. */
export const REVENUECAT_WEEKLY_PACKAGE_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_WEEKLY_PACKAGE_ID ?? 'weekly';

let configured = false;
let listenerAttached = false;

function getApiKey() {
  if (Platform.OS === 'ios') return IOS_API_KEY;
  if (Platform.OS === 'android') return ANDROID_API_KEY;
  return '';
}

function hasEssentials(customerInfo: CustomerInfo) {
  return Boolean(
    customerInfo.entitlements.active[REVENUECAT_ESSENTIALS_ENTITLEMENT_ID]
  );
}

export function applyRevenueCatCustomerInfo(customerInfo: CustomerInfo) {
  const nextTier = hasEssentials(customerInfo) ? 'essentials' : 'free';
  const { tier, setTier } = useSubscriptionStore.getState();

  // Coaching is currently a waitlist / manual tier; don't downgrade it from SDK info.
  if (tier === 'coaching') return;
  if (tier !== nextTier) setTier(nextTier);
}

export async function configureRevenueCat(appUserID?: string) {
  if (configured) return true;

  const apiKey = getApiKey();
  if (!apiKey) {
    if (__DEV__) {
      console.warn('[RevenueCat] Missing public SDK key for this platform.');
    }
    return false;
  }

  try {
    await Purchases.setLogLevel(
      __DEV__ ? Purchases.LOG_LEVEL.DEBUG : Purchases.LOG_LEVEL.WARN
    );
    Purchases.configure({ apiKey, appUserID });
    configured = true;

    if (!listenerAttached) {
      Purchases.addCustomerInfoUpdateListener(applyRevenueCatCustomerInfo);
      listenerAttached = true;
    }

    const customerInfo = await Purchases.getCustomerInfo();
    applyRevenueCatCustomerInfo(customerInfo);
    return true;
  } catch (error) {
    if (__DEV__) {
      console.warn('[RevenueCat] configure failed:', error);
    }
    return false;
  }
}

export async function identifyRevenueCatUser(appUserID: string) {
  const ready = await configureRevenueCat();
  if (!ready) return null;

  const { customerInfo } = await Purchases.logIn(appUserID);
  applyRevenueCatCustomerInfo(customerInfo);
  return customerInfo;
}

export async function logOutRevenueCatUser() {
  if (!configured) return null;

  const customerInfo = await Purchases.logOut();
  applyRevenueCatCustomerInfo(customerInfo);
  return customerInfo;
}

export async function refreshRevenueCatCustomerInfo() {
  const ready = await configureRevenueCat();
  if (!ready) return null;

  const customerInfo = await Purchases.getCustomerInfo();
  applyRevenueCatCustomerInfo(customerInfo);
  return customerInfo;
}

function getWeeklyPackage(offering: PurchasesOffering | null | undefined) {
  if (!offering) return null;

  const packages = offering.availablePackages ?? [];
  return (
    packages.find((pkg) => pkg.identifier === REVENUECAT_WEEKLY_PACKAGE_ID) ??
    packages.find((pkg) => pkg.packageType === 'WEEKLY') ??
    packages.find((pkg) =>
      pkg.product.identifier.toLowerCase().includes('weekly')
    ) ??
    null
  );
}

export async function getRevenueCatWeeklyPackage(): Promise<PurchasesPackage | null> {
  const ready = await configureRevenueCat();
  if (!ready) return null;

  const offerings = await Purchases.getOfferings();
  return getWeeklyPackage(offerings.current);
}

export async function purchaseWeeklyEssentials() {
  const weeklyPackage = await getRevenueCatWeeklyPackage();
  if (!weeklyPackage) {
    throw new Error(
      `No weekly package found in the current RevenueCat offering. Add package "${REVENUECAT_WEEKLY_PACKAGE_ID}" to the Current offering.`
    );
  }

  const { customerInfo } = await Purchases.purchasePackage(weeklyPackage);
  applyRevenueCatCustomerInfo(customerInfo);
  return customerInfo;
}

export async function presentEssentialsPaywallIfNeeded() {
  const ready = await configureRevenueCat();
  if (!ready) {
    throw new Error('RevenueCat is not configured for this platform.');
  }

  const result = await RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: REVENUECAT_ESSENTIALS_ENTITLEMENT_ID,
    displayCloseButton: true,
  });
  const customerInfo = await refreshRevenueCatCustomerInfo();
  return { result, customerInfo };
}

export async function restoreRevenueCatPurchases() {
  const ready = await configureRevenueCat();
  if (!ready) {
    throw new Error('RevenueCat is not configured for this platform.');
  }

  const customerInfo = await Purchases.restorePurchases();
  applyRevenueCatCustomerInfo(customerInfo);
  return customerInfo;
}

export async function presentRevenueCatCustomerCenter() {
  const ready = await configureRevenueCat();
  if (!ready) {
    throw new Error('RevenueCat is not configured for this platform.');
  }

  await RevenueCatUI.presentCustomerCenter({
    callbacks: {
      onRestoreCompleted: ({ customerInfo }) =>
        applyRevenueCatCustomerInfo(customerInfo),
    },
  });
  await refreshRevenueCatCustomerInfo();
}

export function revenueCatPurchaseWasCancelled(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  return Boolean(
    'userCancelled' in error &&
      (error as { userCancelled?: boolean }).userCancelled
  );
}

export function revenueCatPaywallCompleted(result: PAYWALL_RESULT) {
  return (
    result === PAYWALL_RESULT.PURCHASED ||
    result === PAYWALL_RESULT.RESTORED ||
    result === PAYWALL_RESULT.NOT_PRESENTED
  );
}

export function useRevenueCatSubscriptionSync() {
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await configureRevenueCat();
      if (cancelled || !supabaseConfigured || !supabase) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!cancelled && user?.id && isRegisteredAppUser(user)) {
        await identifyRevenueCatUser(user.id);
      }
    })();

    if (!supabaseConfigured || !supabase) {
      return () => {
        cancelled = true;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      const user = session?.user;
      if (user?.id && isRegisteredAppUser(user)) {
        void identifyRevenueCatUser(user.id).catch((error) => {
          if (__DEV__) console.warn('[RevenueCat] logIn failed:', error);
        });
      } else if (event === 'SIGNED_OUT') {
        void logOutRevenueCatUser().catch((error) => {
          if (__DEV__) console.warn('[RevenueCat] logOut failed:', error);
        });
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);
}
