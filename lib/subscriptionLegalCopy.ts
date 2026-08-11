import { Platform } from 'react-native';

import type { EssentialsPurchasePlan } from '@/lib/revenueCat';

export type PaywallVariant = 'default' | 'onboarding';

/** Auto-renewal / purchase footer on the Essentials paywall. */
export function essentialsPaywallLegalCopy(
  plan: EssentialsPurchasePlan,
  options?: { variant?: PaywallVariant; monthlyPrice?: string }
): string {
  const variant = options?.variant ?? 'default';
  const monthlyPrice = options?.monthlyPrice ?? '$4.99';

  if (plan === 'monthly' && variant === 'onboarding') {
    if (Platform.OS === 'ios') {
      return `Start with a 3-day free trial of Essentials. After the trial, your subscription renews at ${monthlyPrice}/month unless canceled at least 24 hours before the trial ends. Payment is charged to your Apple ID. Manage or cancel in Settings → Apple ID → Subscriptions.`;
    }
    if (Platform.OS === 'android') {
      return `Start with a 3-day free trial of Essentials. After the trial, your subscription renews at ${monthlyPrice}/month unless canceled before renewal. Manage or cancel in Google Play subscription settings.`;
    }
    return `3-day free trial, then ${monthlyPrice}/month unless canceled before renewal.`;
  }

  if (plan === 'lifetime') {
    if (Platform.OS === 'ios') {
      return 'Lifetime is a one-time purchase charged to your Apple ID account. It does not auto-renew. Restore purchases if you reinstall or switch devices.';
    }
    if (Platform.OS === 'android') {
      return 'Lifetime is a one-time purchase charged to your Google Play account. It does not auto-renew. Restore purchases if you reinstall or switch devices.';
    }
    return 'Lifetime is a one-time purchase. It does not auto-renew.';
  }

  if (Platform.OS === 'ios') {
    return 'Monthly Essentials is an auto-renewing subscription. Payment is charged to your Apple ID account. It renews each month unless canceled at least 24 hours before the period ends. Manage or cancel in Settings → Apple ID → Subscriptions.';
  }
  if (Platform.OS === 'android') {
    return 'Monthly Essentials is an auto-renewing subscription. Payment is charged to your Google Play account. It renews each month unless canceled before renewal. Manage or cancel in Google Play subscription settings.';
  }
  return 'Monthly Essentials is an auto-renewing subscription. It renews each month unless canceled before renewal.';
}
