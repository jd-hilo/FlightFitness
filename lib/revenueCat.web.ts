/** Web / screenshot stub — RevenueCat native SDK is not loaded. */

export const REVENUECAT_ESSENTIALS_ENTITLEMENT_ID = 'Flight Fitness Essentials';
export const REVENUECAT_MONTHLY_PACKAGE_ID = 'rc_monthly';
export const REVENUECAT_LIFETIME_PACKAGE_ID = 'rc_lifetime';
export const REVENUECAT_WEEKLY_PACKAGE_ID = 'rc_weekly';

export type EssentialsPurchasePlan = 'monthly' | 'lifetime';
export type EssentialsPackages = { monthly: null; lifetime: null };
export type EssentialsOwnership = { hasMonthly: boolean; hasLifetime: boolean };
export type CustomerInfo = { entitlements: { active: Record<string, unknown> } };
export type PurchasesPackage = never;
export type PurchasesOffering = never;

export function getEssentialsOwnership(_info?: CustomerInfo): EssentialsOwnership {
  return { hasMonthly: false, hasLifetime: false };
}

export function customerHasEssentialsEntitlement(_info?: CustomerInfo) {
  return false;
}

export function applyRevenueCatCustomerInfo(_info?: CustomerInfo) {}

export function packageIdForEssentialsPlan(plan: EssentialsPurchasePlan): string {
  return plan === 'monthly' ? REVENUECAT_MONTHLY_PACKAGE_ID : REVENUECAT_LIFETIME_PACKAGE_ID;
}

export async function configureRevenueCat() {
  return false;
}

export async function refreshRevenueCatCustomerInfo() {
  return null;
}

export async function identifyRevenueCatUser(_id?: string) {}

export async function getRevenueCatEssentialsPackages(): Promise<EssentialsPackages> {
  return { monthly: null, lifetime: null };
}

export async function getRevenueCatMonthlyPackage() {
  return null;
}

export async function getRevenueCatLifetimePackage() {
  return null;
}

export async function getRevenueCatWeeklyPackage() {
  return null;
}

export async function getEssentialsMonthlyPriceLabel() {
  return null;
}

export async function getEssentialsLifetimePriceLabel() {
  return null;
}

export async function getEssentialsWeeklyPriceLabel() {
  return null;
}

export async function warmRevenueCatOfferings() {}

export async function purchaseEssentialsPlan(_plan?: EssentialsPurchasePlan) {
  return { ok: false as const, error: 'Purchases are unavailable on web.' };
}

export async function restoreRevenueCatPurchases() {
  return { ok: false as const, error: 'Purchases are unavailable on web.' };
}

export async function presentRevenueCatCustomerCenter() {}

export function useRevenueCatSubscriptionSync() {}

export function revenueCatPurchaseErrorMessage(_error?: unknown) {
  return 'Purchases are unavailable on web.';
}
