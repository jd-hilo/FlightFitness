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

export type EssentialsPurchasePlan = 'monthly' | 'lifetime';

export const REVENUECAT_MONTHLY_PACKAGE_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_MONTHLY_PACKAGE_ID ?? 'rc_monthly';

export const REVENUECAT_LIFETIME_PACKAGE_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_LIFETIME_PACKAGE_ID ?? 'rc_lifetime';

/** Legacy weekly SKU — kept for existing subscribers, not sold in the paywall UI. */
export const REVENUECAT_WEEKLY_PACKAGE_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_WEEKLY_PACKAGE_ID ?? 'rc_weekly';

export type EssentialsPackages = {
  monthly: PurchasesPackage | null;
  lifetime: PurchasesPackage | null;
};

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

export function packageIdForEssentialsPlan(plan: EssentialsPurchasePlan): string {
  return plan === 'monthly'
    ? REVENUECAT_MONTHLY_PACKAGE_ID
    : REVENUECAT_LIFETIME_PACKAGE_ID;
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

async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  const ready = await configureRevenueCat();
  if (!ready) return null;
  const offerings = await Purchases.getOfferings();
  return offerings.current ?? null;
}

function findPackage(
  offering: PurchasesOffering | null | undefined,
  packageId: string,
  options: {
    packageType?: string;
    productIdIncludes?: string;
  }[]
): PurchasesPackage | null {
  const packages = offering?.availablePackages ?? [];
  const byId = packages.find((pkg) => pkg.identifier === packageId);
  if (byId) return byId;

  for (const option of options) {
    if (option.packageType) {
      const match = packages.find((pkg) => pkg.packageType === option.packageType);
      if (match) return match;
    }
    if (option.productIdIncludes) {
      const needle = option.productIdIncludes.toLowerCase();
      const match = packages.find((pkg) =>
        pkg.product.identifier.toLowerCase().includes(needle)
      );
      if (match) return match;
    }
  }

  return null;
}

function getMonthlyPackage(offering: PurchasesOffering | null | undefined) {
  return findPackage(offering, REVENUECAT_MONTHLY_PACKAGE_ID, [
    { packageType: 'MONTHLY' },
    { productIdIncludes: 'monthly' },
  ]);
}

function getLifetimePackage(offering: PurchasesOffering | null | undefined) {
  return findPackage(offering, REVENUECAT_LIFETIME_PACKAGE_ID, [
    { packageType: 'LIFETIME' },
    { productIdIncludes: 'lifetime' },
  ]);
}

function getWeeklyPackage(offering: PurchasesOffering | null | undefined) {
  return findPackage(offering, REVENUECAT_WEEKLY_PACKAGE_ID, [
    { packageType: 'WEEKLY' },
    { productIdIncludes: 'weekly' },
  ]);
}

export async function getRevenueCatEssentialsPackages(): Promise<EssentialsPackages> {
  const offering = await getCurrentOffering();
  return {
    monthly: getMonthlyPackage(offering),
    lifetime: getLifetimePackage(offering),
  };
}

export async function getRevenueCatMonthlyPackage(): Promise<PurchasesPackage | null> {
  const offering = await getCurrentOffering();
  return getMonthlyPackage(offering);
}

export async function getRevenueCatLifetimePackage(): Promise<PurchasesPackage | null> {
  const offering = await getCurrentOffering();
  return getLifetimePackage(offering);
}

/** @deprecated Legacy weekly SKU — use monthly/lifetime in the paywall. */
export async function getRevenueCatWeeklyPackage(): Promise<PurchasesPackage | null> {
  const offering = await getCurrentOffering();
  return getWeeklyPackage(offering);
}

async function purchasePackage(pkg: PurchasesPackage | null) {
  const ready = await configureRevenueCat();
  if (!ready) {
    throw new Error('SUBSCRIPTION_UNAVAILABLE');
  }
  if (!pkg) {
    throw new Error('SUBSCRIPTION_PRODUCT_UNAVAILABLE');
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
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

export async function purchaseEssentials(plan: EssentialsPurchasePlan) {
  const packages = await getRevenueCatEssentialsPackages();
  const pkg = plan === 'monthly' ? packages.monthly : packages.lifetime;
  return purchasePackage(pkg);
}

/** @deprecated Use purchaseEssentials('monthly'). */
export async function purchaseWeeklyEssentials() {
  const pkg = await getRevenueCatWeeklyPackage();
  return purchasePackage(pkg);
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
    if (
      error.message.includes('No weekly package') ||
      error.message.includes('package')
    ) {
      return 'This plan is not available right now. Please try again later.';
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
    return 'This plan is not available in the App Store right now.';
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
    return 'You already own this on this Apple ID. Try Restore purchases.';
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
    return 'Subscription setup is incomplete. Confirm products are approved in App Store Connect and linked in RevenueCat.';
  }
  if (haystack.includes('INSUFFICIENT_PERMISSIONS')) {
    return 'This Apple ID cannot make purchases. Check Screen Time or App Store restrictions.';
  }

  if (__DEV__ && (message || underlying)) {
    console.warn('[RevenueCat] purchase error detail:', { code, message, underlying });
  }

  return 'Could not complete your purchase. Please try again.';
}

export async function getEssentialsMonthlyPriceLabel(): Promise<string | null> {
  const pkg = await getRevenueCatMonthlyPackage();
  return pkg?.product.priceString ?? null;
}

export async function getEssentialsLifetimePriceLabel(): Promise<string | null> {
  const pkg = await getRevenueCatLifetimePackage();
  return pkg?.product.priceString ?? null;
}

/** @deprecated Use getEssentialsMonthlyPriceLabel. */
export async function getEssentialsWeeklyPriceLabel(): Promise<string | null> {
  const pkg = await getRevenueCatWeeklyPackage();
  return pkg?.product.priceString ?? null;
}

export async function warmRevenueCatOfferings() {
  await configureRevenueCat();
  await getRevenueCatEssentialsPackages();
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
