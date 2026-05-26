import { Platform } from 'react-native';

/** Auto-renewal footer on the Essentials paywall — platform-specific (no Google Play on iOS builds). */
export function essentialsPaywallLegalCopy(): string {
  if (Platform.OS === 'ios') {
    return 'Essentials is a weekly auto-renewing subscription. Payment is charged to your Apple ID account. It renews each week unless canceled at least 24 hours before the period ends. Manage or cancel in Settings → Apple ID → Subscriptions.';
  }
  if (Platform.OS === 'android') {
    return 'Essentials is a weekly auto-renewing subscription. Payment is charged to your Google Play account. It renews each week unless canceled before renewal. Manage or cancel in Google Play subscription settings.';
  }
  return 'Essentials is a weekly auto-renewing subscription. It renews each week unless canceled before renewal.';
}
