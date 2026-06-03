import { useEffect } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';

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
  process.env.EXPO_PUBLIC_REVENUECAT_ESSENTIALS_ENTITLEMENT_ID ??
  'Flight Fitness Essentials';

/** Known dashboard identifiers — checked in order after the env override. */
const ESSENTIALS_ENTITLEMENT_FALLBACK_IDS = [
  'Flight Fitness Essentials',
  'essentials',
] as const;

/** Current offering package identifier for the weekly Essentials product. */
export const REVENUECAT_WEEKLY_PACKAGE_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_WEEKLY_PACKAGE_ID ?? 'weekly';

function essentialsEntitlementIds(): string[] {
  const ids = [
    REVENUECAT_ESSENTIALS_ENTITLEMENT_ID,
    ...ESSENTIALS_ENTITLEMENT_FALLBACK_IDS,
  ];
  return [...new Set(ids.filter(Boolean))];
}

let configured = false;
let listenerAttached = false;
/** Avoid duplicate `logIn` calls for the same Supabase user (can trigger noisy attribute sync). */
let lastIdentifiedAppUserId: string | null = null;

function getApiKey() {
  if (Platform.OS === 'ios') return IOS_API_KEY;
  if (Platform.OS === 'android') return ANDROID_API_KEY;
  return '';
}

function hasEssentials(customerInfo: CustomerInfo) {
  const active = customerInfo.entitlements.active;
  return essentialsEntitlementIds().some((id) => Boolean(active[id]));
}

export function customerHasEssentialsEntitlement(customerInfo: CustomerInfo) {
  return hasEssentials(customerInfo);
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

  try {
    const currentId = await Purchases.getAppUserID();
    if (currentId === appUserID || lastIdentifiedAppUserId === appUserID) {
      const customerInfo = await Purchases.getCustomerInfo();
      applyRevenueCatCustomerInfo(customerInfo);
      lastIdentifiedAppUserId = appUserID;
      return customerInfo;
    }
  } catch {
    // If getAppUserID fails, fall through to logIn.
  }

  const { customerInfo } = await Purchases.logIn(appUserID);
  lastIdentifiedAppUserId = appUserID;
  applyRevenueCatCustomerInfo(customerInfo);
  return customerInfo;
}

export async function logOutRevenueCatUser() {
  if (!configured) return null;

  const customerInfo = await Purchases.logOut();
  lastIdentifiedAppUserId = null;
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
  const ready = await configureRevenueCat();
  if (!ready) {
    throw new Error('SUBSCRIPTION_UNAVAILABLE');
  }

  const weeklyPackage = await getRevenueCatWeeklyPackage();
  if (!weeklyPackage) {
    throw new Error('SUBSCRIPTION_PRODUCT_UNAVAILABLE');
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(weeklyPackage);
    applyRevenueCatCustomerInfo(customerInfo);
    return customerInfo;
  } catch (error) {
    if (revenueCatPurchaseWasCancelled(error)) {
      throw error;
    }
    if (__DEV__) {
      console.warn('[RevenueCat] purchase failed:', error);
    }
    throw error;
  }
}

export async function restoreRevenueCatPurchases() {
  const ready = await configureRevenueCat();
  if (!ready) {
    throw new Error('SUBSCRIPTION_UNAVAILABLE');
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
      onPromotionalOfferSucceeded: ({ customerInfo }) =>
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

export function revenueCatPurchaseErrorCode(error: unknown): string {
  const { code, message, underlying } = revenueCatErrorFields(error);
  return code || message || underlying || 'unknown';
}

function revenueCatErrorFields(error: unknown) {
  if (!error || typeof error !== 'object') {
    return { code: '', message: '', underlying: '' };
  }
  const e = error as {
    code?: unknown;
    message?: unknown;
    underlyingErrorMessage?: unknown;
  };
  return {
    code: String(e.code ?? ''),
    message: typeof e.message === 'string' ? e.message : '',
    underlying:
      typeof e.underlyingErrorMessage === 'string'
        ? e.underlyingErrorMessage
        : '',
  };
}

/** User-safe message for purchase / restore failures (never show SDK config strings in production UI). */
export function formatRevenueCatPurchaseError(error: unknown): string {
  if (revenueCatPurchaseWasCancelled(error)) return '';

  if (error instanceof Error) {
    if (
      error.message === 'SUBSCRIPTION_UNAVAILABLE' ||
      error.message === 'SUBSCRIPTION_PRODUCT_UNAVAILABLE' ||
      error.message.includes('RevenueCat is not configured')
    ) {
      return 'Subscriptions are not available right now. Please try again in a moment.';
    }
    if (error.message.includes('No weekly package')) {
      return 'This subscription is not available right now. Please try again later.';
    }
  }

  const { code, message, underlying } = revenueCatErrorFields(error);
  const haystack = `${code} ${message} ${underlying}`.toUpperCase();

  if (haystack.includes('PURCHASE_NOT_ALLOWED')) {
    return 'Purchases are not allowed on this device.';
  }
  if (
    haystack.includes('PRODUCT_NOT_AVAILABLE') ||
    haystack.includes('PRODUCT_NOT_FOUND')
  ) {
    return 'This subscription is not available in the App Store right now.';
  }
  if (haystack.includes('NETWORK')) {
    return 'Network error. Check your connection and try again.';
  }
  if (haystack.includes('STORE_PROBLEM')) {
    return 'The App Store is temporarily unavailable. Please try again later.';
  }
  if (
    haystack.includes('PRODUCT_ALREADY_PURCHASED') ||
    haystack.includes('ALREADY_PURCHASED')
  ) {
    return 'You already have this subscription on this Apple ID. Try Restore purchases.';
  }
  if (haystack.includes('RECEIPT_ALREADY_IN_USE')) {
    return 'This Apple ID is linked to another account. Sign in with the account that originally purchased, or use Restore purchases.';
  }
  if (haystack.includes('PAYMENT_PENDING')) {
    return 'Your payment is pending approval. Check back in a few minutes or in Settings → Apple ID → Subscriptions.';
  }
  if (
    haystack.includes('PURCHASE_INVALID') ||
    haystack.includes('INVALID_RECEIPT') ||
    haystack.includes('CONFIGURATION')
  ) {
    return 'Subscription setup is incomplete. Confirm the Essentials product is approved in App Store Connect and linked in RevenueCat.';
  }
  if (haystack.includes('INSUFFICIENT_PERMISSIONS')) {
    return 'This Apple ID cannot make purchases. Check Screen Time or App Store restrictions.';
  }

  if (__DEV__ && (message || underlying)) {
    console.warn('[RevenueCat] purchase error detail:', { code, message, underlying });
  }

  return 'Could not complete your purchase. Please try again.';
}

export async function getEssentialsWeeklyPriceLabel(): Promise<string | null> {
  const ready = await configureRevenueCat();
  if (!ready) return null;
  const weeklyPackage = await getRevenueCatWeeklyPackage();
  return weeklyPackage?.product.priceString ?? null;
}

export async function warmRevenueCatOfferings() {
  await configureRevenueCat();
  await getRevenueCatWeeklyPackage();
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
