/**
 * Shared marketing copy for Essentials, FF Custom Coaching (upgrade + paywall +
 * waitlist modal).
 */

/** Essentials is only offered as a weekly-renewing subscription (no monthly/yearly SKU). */
export const ESSENTIALS_WEEKLY_ONLY_CAPTION = 'Weekly subscription · full app access';

export const ESSENTIALS_FEATURES = [
  {
    icon: 'menu-book',
    label: 'Daily faith rooted in Scripture, in the app.',
  },
  {
    icon: 'calendar-month',
    label: 'Weeks of meals and training, built around your goals.',
  },
  {
    icon: 'tune',
    label: 'Adjust meals, days, and macros when life changes.',
  },
  {
    icon: 'shopping-cart',
    label: 'Grocery list generated from your meal plan.',
  },
] as const;

export type EssentialsPlanFeature = (typeof ESSENTIALS_FEATURES)[number];

export const COACHING_DESCRIPTION =
  'A real coach builds your meals and training for your life and walks with you toward strength in body and spirit.';

export const COACHING_FEATURES = [
  {
    icon: 'workspace-premium',
    label: 'Everything in Essentials, including daily faith study.',
  },
  {
    icon: 'auto-stories',
    label: 'Reflections from your coach for faith and habits.',
  },
  {
    icon: 'fitness-center',
    label: 'Faith-forward programming from your FF partner coach.',
  },
  {
    icon: 'chat-bubble',
    label: 'Message your coach when you need clarity or support.',
  },
] as const;

export type CoachingPlanFeature = (typeof COACHING_FEATURES)[number];

export const COACHING_WAITLIST_HINT =
  'Coaching seats are limited. Join the waitlist with your email and we will reach out when a spot opens.';

/** Small print on the Essentials offer card when the user does not already have it. */
export const ESSENTIALS_RENEWAL_FOOTNOTE = 'Renews weekly · cancel anytime';

/** Paywall / upgrade footer — Essentials is the only purchasable tier here and is weekly. */
export const ESSENTIALS_PAYWALL_LEGAL =
  'Essentials bills weekly and auto-renews until you cancel in subscription settings (App Store or Google Play).';
